import { createClient } from "@/lib/supabase/server";
import type { AdminKpi, CarelinDeskRow, CarelinRequest } from "@/lib/types";
import { bangkokDateOf, relativeThaiDay, today } from "@/lib/time";
import { addDays, dayRange, weekRange } from "@/lib/queries/util";

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
    const replies =
      (r.carelin_replies as unknown as Array<{
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
      when: relativeThaiDay(r.created_at),
      status: r.status as CarelinRequest["status"],
      reply: reply
        ? {
            teacher: reply.teacher_name ?? "",
            role: reply.role_label ?? "",
            when: relativeThaiDay(reply.created_at),
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
    .select(
      "id, title, body, who_name, student_id_4, klass, status, created_at",
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(`getCarelinDeskRows: ${error.message}`);
  return (data ?? []).map<CarelinDeskRow>((r) => ({
    id: r.id,
    when: relativeThaiDay(r.created_at),
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

export type CarelinDetail = {
  id: string;
  title: string;
  body: string;
  who: string;
  studentId: string;
  klass: string;
  status: "open" | "answered";
  when: string;
  replies: Array<{
    teacher: string;
    role: string;
    body: string;
    avatar: string;
    when: string;
  }>;
};

export async function getCarelinDetail(
  id: string,
): Promise<CarelinDetail | null> {
  const db = await createClient();
  const { data, error } = await db
    .from("carelin_requests")
    .select(
      "id, title, body, who_name, student_id_4, klass, status, created_at, carelin_replies(teacher_name, role_label, body, avatar_letter, created_at)",
    )
    .eq("id", id)
    .single();
  if (error || !data) return null;
  const replies =
    (data.carelin_replies as unknown as Array<{
      teacher_name: string | null;
      role_label: string | null;
      body: string;
      avatar_letter: string | null;
      created_at: string;
    }>) ?? [];
  return {
    id: data.id,
    title: data.title,
    body: data.body,
    who: data.who_name,
    studentId: data.student_id_4,
    klass: data.klass ?? "",
    status: data.status as CarelinDetail["status"],
    when: relativeThaiDay(data.created_at),
    replies: replies
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((r) => ({
        teacher: r.teacher_name ?? "",
        role: r.role_label ?? "",
        body: r.body,
        avatar: r.avatar_letter ?? "",
        when: relativeThaiDay(r.created_at),
      })),
  };
}

export async function getCarelinTabCounts(): Promise<{
  all: number;
  open: number;
  answered: number;
}> {
  const db = await createClient();
  const [allRes, openRes, answeredRes] = await Promise.all([
    db.from("carelin_requests").select("*", { count: "exact", head: true }),
    db
      .from("carelin_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "open"),
    db
      .from("carelin_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "answered"),
  ]);
  if (allRes.error)
    throw new Error(`getCarelinTabCounts: ${allRes.error.message}`);
  if (openRes.error)
    throw new Error(`getCarelinTabCounts: ${openRes.error.message}`);
  if (answeredRes.error) {
    throw new Error(`getCarelinTabCounts: ${answeredRes.error.message}`);
  }
  return {
    all: allRes.count ?? 0,
    open: openRes.count ?? 0,
    answered: answeredRes.count ?? 0,
  };
}

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function deltaVs(curr: number, prev: number, label: string): AdminKpi["delta"] {
  if (curr > prev)
    return { kind: "up", text: `▲ ${fmt(curr - prev)} vs ${label}` };
  if (curr < prev)
    return { kind: "down", text: `▼ ${fmt(prev - curr)} vs ${label}` };
  return { kind: "flat", text: `— same as ${label}` };
}

function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = ms / 3_600_000;
  if (hours < 24) return `${hours.toFixed(1)} hr`;
  return `${(hours / 24).toFixed(1)} d`;
}

/**
 * The four Carelin Desk status bars, computed live from carelin_requests and
 * their replies (replaces the old static site_config `carelin_kpis`):
 *   1. Open today    — requests currently open; delta = new requests today
 *   2. Answered today — requests whose first reply landed today; delta vs yesterday
 *   3. Avg response  — mean time from request to first reply, over answered ones
 *   4. Total · week  — requests created this week; delta vs last week
 */
export async function getCarelinKpis(): Promise<AdminKpi[]> {
  const db = await createClient();
  const todayISO = today();
  const yesterdayISO = addDays(todayISO, -1);
  const todayBounds = dayRange(todayISO);
  const thisWeek = weekRange(todayISO);
  const lastWeek = weekRange(addDays(thisWeek.days[0], -7));

  const [openRes, newTodayRes, thisWeekRes, lastWeekRes, answeredRes] =
    await Promise.all([
      db
        .from("carelin_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "open"),
      db
        .from("carelin_requests")
        .select("*", { count: "exact", head: true })
        .gte("created_at", todayBounds.start)
        .lt("created_at", todayBounds.next),
      db
        .from("carelin_requests")
        .select("*", { count: "exact", head: true })
        .gte("created_at", thisWeek.start)
        .lt("created_at", thisWeek.next),
      db
        .from("carelin_requests")
        .select("*", { count: "exact", head: true })
        .gte("created_at", lastWeek.start)
        .lt("created_at", lastWeek.next),
      db
        .from("carelin_requests")
        .select("created_at, carelin_replies(created_at)")
        .eq("status", "answered"),
    ]);

  for (const r of [
    openRes,
    newTodayRes,
    thisWeekRes,
    lastWeekRes,
    answeredRes,
  ]) {
    if (r.error) throw new Error(`getCarelinKpis: ${r.error.message}`);
  }

  // First-reply timing: answered-today/yesterday counts and mean response time.
  const answered =
    (answeredRes.data as
      | { created_at: string; carelin_replies: { created_at: string }[] }[]
      | null) ?? [];
  let answeredToday = 0;
  let answeredYesterday = 0;
  let responseSum = 0;
  let responseCount = 0;
  for (const req of answered) {
    const replies = req.carelin_replies ?? [];
    if (!replies.length) continue;
    const firstReply = replies.reduce((a, b) =>
      a.created_at <= b.created_at ? a : b,
    ).created_at;
    const repliedOn = bangkokDateOf(firstReply);
    if (repliedOn === todayISO) answeredToday++;
    else if (repliedOn === yesterdayISO) answeredYesterday++;
    const ms =
      new Date(firstReply).getTime() - new Date(req.created_at).getTime();
    if (ms >= 0) {
      responseSum += ms;
      responseCount++;
    }
  }

  const openCount = openRes.count ?? 0;
  const newToday = newTodayRes.count ?? 0;
  const thisWeekCount = thisWeekRes.count ?? 0;
  const lastWeekCount = lastWeekRes.count ?? 0;

  return [
    {
      label: "Open today",
      th: "รออยู่",
      num: fmt(openCount),
      delta:
        newToday > 0
          ? { kind: "flat", text: `▲ ${fmt(newToday)} new today` }
          : { kind: "flat", text: "— none today" },
    },
    {
      label: "Answered today",
      th: "ตอบแล้ว",
      num: fmt(answeredToday),
      delta: deltaVs(answeredToday, answeredYesterday, "yesterday"),
    },
    {
      label: "Avg response",
      th: "เวลาตอบเฉลี่ย",
      num: responseCount ? formatDuration(responseSum / responseCount) : "—",
      delta:
        responseCount > 0
          ? { kind: "flat", text: `— over ${fmt(responseCount)} answered` }
          : { kind: "flat", text: "— no replies yet" },
    },
    {
      label: "Total · this week",
      th: "สัปดาห์นี้",
      num: fmt(thisWeekCount),
      delta: deltaVs(thisWeekCount, lastWeekCount, "last wk"),
    },
  ];
}
