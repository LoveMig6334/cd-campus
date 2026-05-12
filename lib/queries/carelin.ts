import { createClient } from "@/lib/supabase/server";
import type { CarelinDeskRow, CarelinRequest } from "@/lib/types";

function relativeWhen(ts: string): string {
  // For the prototype: derive a Thai-friendly relative time from `created_at`.
  // Without real elapsed time, prefer a deterministic label derived from the date:
  // - same day as 2026-05-12 → "HH:MM"
  // - one day before     → "เมื่อวาน"
  // - otherwise          → ISO date stripped
  const m = ts.match(/-(\d{2})-(\d{2})T(\d{2}:\d{2})/);
  if (!m) return ts;
  const day = parseInt(m[2], 10);
  const hhmm = m[3];
  if (day === 12) return hhmm;
  if (day === 11) return "เมื่อวาน";
  return `${day} พ.ค.`;
}

export async function getCarelinRequests(): Promise<CarelinRequest[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("carelin_requests")
    .select(
      "id, title, body, who_name, student_id_4, status, created_at, carelin_replies(teacher_name, role_label, body, avatar_letter, created_at)",
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(`getCarelinRequests: ${error.message}`);
  return (data ?? []).map<CarelinRequest>((r) => {
    const replies = (r.carelin_replies as unknown as Array<{
      teacher_name: string | null;
      role_label: string | null;
      body: string;
      avatar_letter: string | null;
      created_at: string;
    }>) ?? [];
    const reply = replies[0];
    return {
      title: r.title,
      body: r.body,
      who: r.who_name,
      studentId: r.student_id_4,
      when: relativeWhen(r.created_at),
      status: r.status as CarelinRequest["status"],
      reply: reply
        ? {
            teacher: reply.teacher_name ?? "",
            role: reply.role_label ?? "",
            when: relativeWhen(reply.created_at),
            body: reply.body,
            avatar: reply.avatar_letter ?? "",
          }
        : undefined,
    };
  });
}

export async function getCarelinDeskRows(): Promise<CarelinDeskRow[]> {
  const db = await createClient();
  const { data, error } = await db
    .from("carelin_requests")
    .select("title, body, who_name, student_id_4, klass, status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`getCarelinDeskRows: ${error.message}`);
  return (data ?? []).map<CarelinDeskRow>((r) => ({
    when: relativeWhen(r.created_at),
    requester: {
      name: r.who_name,
      studentId: r.student_id_4,
      klass: r.klass ?? "",
    },
    title: r.title,
    snippet: r.body.length > 60 ? r.body.slice(0, 60) + "..." : r.body,
    status: r.status === "answered" ? "Answered" : "Open",
  }));
}
