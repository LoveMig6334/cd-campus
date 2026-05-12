import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminTopbar } from "@/components/layout/AdminTopbar";
import { Btn } from "@/components/admin/Btn";
import { Card, CardTitle } from "@/components/admin/Card";
import { Pill } from "@/components/admin/Pill";
import { getCarelinDetail } from "@/lib/queries/carelin";
import { markAnswered, replyToCarelin } from "../actions";

export default async function CarelinDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const request = await getCarelinDetail(id);
  if (!request) notFound();

  return (
    <>
      <AdminTopbar
        titleTh="คำขอ"
        eyebrow="Carelin · request"
        actions={
          <Link
            href="/admin/carelin"
            className="inline-block border-[1.5px] border-line bg-paper px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-mute-700"
          >
            ← Back
          </Link>
        }
      />

      <Card>
        <div className="mb-3 flex items-start justify-between gap-3">
          <CardTitle
            th={request.title}
            en={`From ${request.who} · #${request.studentId}${request.klass ? ` · ${request.klass}` : ""}`}
          />
          {request.status === "open" ? (
            <Pill variant="pend">Open</Pill>
          ) : (
            <Pill variant="ok">Answered</Pill>
          )}
        </div>
        <p className="whitespace-pre-line text-[14px] leading-[1.55] text-ink">
          {request.body}
        </p>
      </Card>

      <Card className="mt-[18px]">
        <CardTitle th="คำตอบ" en="Replies" />
        {request.replies.length === 0 ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-mute-500">
            No replies yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {request.replies.map((r, i) => (
              <li key={i} className="border-[1.5px] border-dashed border-ink bg-cream px-3 py-2.5">
                <div className="mb-1 font-display italic text-[14px]">
                  {r.teacher}
                  {r.role ? ` · ${r.role}` : ""}
                  <span className="ml-2 font-mono text-[10px] not-italic text-mute-500">{r.when}</span>
                </div>
                <p className="whitespace-pre-line text-[13.5px] leading-[1.5] text-ink">{r.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-[18px]">
        <CardTitle th="ตอบกลับ" en="Reply" />
        <form action={replyToCarelin} className="space-y-3">
          <input type="hidden" name="request_id" value={request.id} />
          <label className="block">
            <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-mute-700">
              Role label (optional, e.g. Physics / ดนตรี)
            </span>
            <input
              name="role_label"
              type="text"
              maxLength={40}
              className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[13px] text-ink"
            />
          </label>
          <label className="block">
            <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-mute-700">
              Reply body
            </span>
            <textarea
              name="body"
              required
              rows={5}
              className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[13.5px] text-ink"
            />
          </label>
          <Btn variant="primary">Send reply →</Btn>
        </form>
      </Card>

      {request.status === "open" && (
        <Card className="mt-[18px]">
          <form action={markAnswered}>
            <input type="hidden" name="request_id" value={request.id} />
            <Btn>Mark as answered ✓</Btn>
          </form>
        </Card>
      )}
    </>
  );
}
