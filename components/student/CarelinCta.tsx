import Link from "next/link";

export function CarelinCta() {
  return (
    <Link
      href="/student/carelin/new"
      className="flex w-full items-center gap-3 border-[1.5px] border-line bg-house-pink px-4 py-3.5 text-left text-white transition-transform [box-shadow:4px_4px_0_var(--color-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:[box-shadow:6px_6px_0_var(--color-ink)]"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center border-[1.5px] border-ink bg-paper font-display italic text-[26px] leading-none text-house-pink">
        +
      </span>
      <span>
        <span className="block font-display italic text-[19px] leading-[1.05]">
          โพสต์ขอความช่วยเหลือ
        </span>
        <small className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.16em] not-italic text-yellow">
          Post a request
        </small>
      </span>
    </Link>
  );
}
