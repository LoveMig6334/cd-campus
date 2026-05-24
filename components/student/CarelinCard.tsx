import type { CarelinRequest } from "@/lib/types";
import { cn } from "@/lib/cn";

const STATUS_CLASS: Record<CarelinRequest["status"], string> = {
  open: "bg-yellow text-ink border-ink",
  answered: "bg-house-green text-white border-house-green",
};

const STATUS_LABEL: Record<CarelinRequest["status"], string> = {
  open: "● Open",
  answered: "✓ Answered",
};

export function CarelinCard({ request }: { request: CarelinRequest }) {
  return (
    <article className="border-line bg-paper border-[1.5px] px-3.5 pt-3 pb-3.5">
      <header className="mb-1 flex items-start justify-between gap-2.5">
        <h3 className="font-display flex-1 text-[17px] leading-[1.2] italic">
          {request.title}
        </h3>
        <span
          className={cn(
            "shrink-0 border px-1.5 py-0.5 font-mono text-[9px] tracking-[0.1em] whitespace-nowrap uppercase",
            STATUS_CLASS[request.status],
          )}
        >
          {STATUS_LABEL[request.status]}
        </span>
      </header>
      <p className="text-mute-700 mb-2 text-[12.5px] leading-[1.5]">
        {request.body}
      </p>
      <div className="text-mute-500 flex gap-1.5 font-mono text-[9.5px] tracking-[0.06em]">
        <span className="text-blue-deep font-medium">
          {request.who} · #{request.studentId}
        </span>
        <span>{request.when}</span>
      </div>

      {request.reply && (
        <div className="border-ink bg-cream mt-2.5 border border-dashed px-3 py-2.5">
          <div className="mb-1.5 flex items-center gap-2">
            <div className="border-ink bg-blue font-display text-yellow grid h-7 w-7 place-items-center rounded-full border-[1.2px] text-[14px] italic">
              {request.reply.avatar}
            </div>
            <div>
              <div className="font-display text-[13px] leading-none italic">
                {request.reply.teacher} · {request.reply.role}
              </div>
              <div className="text-mute-500 mt-1 font-mono text-[9px] tracking-[0.08em]">
                {request.reply.when}
              </div>
            </div>
          </div>
          <p className="text-ink text-[12.5px] leading-[1.5]">
            {request.reply.body}
          </p>
        </div>
      )}
    </article>
  );
}
