import type { CarelinRequest } from "@/data/types";
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
    <article className="border-[1.5px] border-line bg-paper px-3.5 pt-3 pb-3.5">
      <header className="mb-1 flex items-start justify-between gap-2.5">
        <h3 className="flex-1 font-display italic text-[17px] leading-[1.2]">
          {request.title}
        </h3>
        <span
          className={cn(
            "shrink-0 whitespace-nowrap border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em]",
            STATUS_CLASS[request.status],
          )}
        >
          {STATUS_LABEL[request.status]}
        </span>
      </header>
      <p className="mb-2 text-[12.5px] leading-[1.5] text-mute-700">
        {request.body}
      </p>
      <div className="flex gap-1.5 font-mono text-[9.5px] tracking-[0.06em] text-mute-500">
        <span className="font-medium text-blue">
          {request.who} · #{request.studentId}
        </span>
        <span>{request.when}</span>
      </div>

      {request.reply && (
        <div className="mt-2.5 border border-dashed border-ink bg-cream px-3 py-2.5">
          <div className="mb-1.5 flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-full border-[1.2px] border-ink bg-blue font-display italic text-[14px] text-yellow">
              {request.reply.avatar}
            </div>
            <div>
              <div className="font-display italic text-[13px] leading-none">
                {request.reply.teacher} · {request.reply.role}
              </div>
              <div className="mt-1 font-mono text-[9px] tracking-[0.08em] text-mute-500">
                {request.reply.when}
              </div>
            </div>
          </div>
          <p className="text-[12.5px] leading-[1.5] text-ink">
            {request.reply.body}
          </p>
        </div>
      )}
    </article>
  );
}
