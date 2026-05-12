import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/supabase/database.types";
import { CARELIN_REQUESTS } from "./data/carelin-requests";
import { CARELIN_DESK_ROWS } from "./data/admin-carelin";
import { logStep } from "./util";

type ReqInsert = Database["public"]["Tables"]["carelin_requests"]["Insert"];
type ReplyInsert = Database["public"]["Tables"]["carelin_replies"]["Insert"];

export async function seedCarelin(
  db: SupabaseClient<Database>,
  adminId: string,
): Promise<void> {
  const doneReq = logStep("carelin_requests");

  const klassByKey = new Map(
    CARELIN_DESK_ROWS.map((r) => [
      `${r.requester.name}|${r.requester.studentId}`,
      r.requester.klass,
    ]),
  );

  type Combined = ReqInsert & {
    _reply?: { teacher: string; role: string; body: string; avatar: string };
  };

  const seen = new Set<string>();
  const combined: Combined[] = [];

  for (const r of CARELIN_REQUESTS) {
    const key = `${r.who}|${r.studentId}`;
    seen.add(key);
    combined.push({
      title: r.title,
      body: r.body,
      who_name: r.who,
      student_id_4: r.studentId,
      klass: klassByKey.get(key) ?? null,
      status: r.status,
      _reply: r.reply
        ? {
            teacher: r.reply.teacher,
            role: r.reply.role,
            body: r.reply.body,
            avatar: r.reply.avatar,
          }
        : undefined,
    });
  }

  for (const r of CARELIN_DESK_ROWS) {
    const key = `${r.requester.name}|${r.requester.studentId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    combined.push({
      title: r.title,
      body: r.snippet,
      who_name: r.requester.name,
      student_id_4: r.requester.studentId,
      klass: r.requester.klass,
      status: r.status === "Answered" ? "answered" : "open",
    });
  }

  // Reset requests and replies.
  const { error: replyDelErr } = await db
    .from("carelin_replies")
    .delete()
    .not("id", "is", null);
  if (replyDelErr) throw new Error(`carelin_replies delete: ${replyDelErr.message}`);
  const { error: reqDelErr } = await db
    .from("carelin_requests")
    .delete()
    .not("id", "is", null);
  if (reqDelErr) throw new Error(`carelin_requests delete: ${reqDelErr.message}`);

  // Insert requests, capture ids, then insert replies.
  const requestsToInsert: ReqInsert[] = combined.map((c) => ({
    title: c.title,
    body: c.body,
    who_name: c.who_name,
    student_id_4: c.student_id_4,
    klass: c.klass,
    status: c.status,
  }));
  const { data: inserted, error: reqErr } = await db
    .from("carelin_requests")
    .insert(requestsToInsert)
    .select("id, who_name, student_id_4");
  if (reqErr || !inserted) {
    throw new Error(`carelin_requests insert: ${reqErr?.message}`);
  }
  doneReq(inserted.length);

  const idByKey = new Map(
    inserted.map((r) => [`${r.who_name}|${r.student_id_4}`, r.id]),
  );
  const replies: ReplyInsert[] = combined.flatMap((c) => {
    if (!c._reply) return [];
    const id = idByKey.get(`${c.who_name}|${c.student_id_4}`);
    if (!id) return [];
    return [{
      request_id: id,
      teacher_name: c._reply.teacher,
      role_label: c._reply.role,
      body: c._reply.body,
      avatar_letter: c._reply.avatar,
      created_by_admin_id: adminId,
    }];
  });

  const doneReply = logStep("carelin_replies");
  if (replies.length > 0) {
    const { error } = await db.from("carelin_replies").insert(replies);
    if (error) throw new Error(`carelin_replies insert: ${error.message}`);
  }
  doneReply(replies.length);
}
