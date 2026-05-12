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
            className="border-line bg-paper text-mute-700 inline-block border-[1.5px] px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase"
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
        <p className="text-ink text-[14px] leading-[1.55] whitespace-pre-line">
          {request.body}
        </p>
      </Card>

      <Card className="mt-[18px]">
        <CardTitle th="คำตอบ" en="Replies" />
        {request.replies.length === 0 ? (
          <p className="text-mute-500 font-mono text-[11px] tracking-[0.14em] uppercase">
            No replies yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {request.replies.map((r, i) => (
              <li
                key={i}
                className="border-ink bg-cream border-[1.5px] border-dashed px-3 py-2.5"
              >
                <div className="font-display mb-1 text-[14px] italic">
                  {r.teacher}
                  {r.role ? ` · ${r.role}` : ""}
                  <span className="text-mute-500 ml-2 font-mono text-[10px] not-italic">
                    {r.when}
                  </span>
                </div>
                <p className="text-ink text-[13.5px] leading-[1.5] whitespace-pre-line">
                  {r.body}
                </p>
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
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.14em] uppercase">
              Role label (optional, e.g. Physics / ดนตรี)
            </span>
            <input
              name="role_label"
              type="text"
              maxLength={40}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[13px]"
            />
          </label>
          <label className="block">
            <span className="text-mute-700 block font-mono text-[10px] tracking-[0.14em] uppercase">
              Reply body
            </span>
            <textarea
              name="body"
              required
              rows={5}
              className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[13.5px]"
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
