import Link from "next/link";
import type { ReactNode } from "react";

export function PageHead({
  titleTh,
  titleEn,
  backHref = "/student",
  action,
}: {
  titleTh: string;
  titleEn: string;
  backHref?: string;
  action?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-[5] flex items-center justify-between bg-cream px-5 pt-[14px] pb-2 border-b border-black/[0.06]">
      <Link
        href={backHref}
        aria-label="Back · ย้อนกลับ"
        className="grid h-[34px] w-[34px] place-items-center rounded-full border-[1.5px] border-line bg-paper transition-colors hover:bg-yellow"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </Link>
      <div className="text-center leading-none">
        <div className="font-display italic text-[20px]">{titleTh}</div>
        <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-mute-500">
          {titleEn}
        </div>
      </div>
      <div className="flex h-[34px] w-[34px] items-center justify-center">
        {action}
      </div>
    </header>
  );
}
