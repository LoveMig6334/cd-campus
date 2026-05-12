import Link from "next/link";

export function CarelinCta() {
  return (
    <Link
      href="/student/carelin/new"
      className="border-line bg-house-pink flex w-full items-center gap-3 border-[1.5px] px-4 py-3.5 text-left text-white [box-shadow:4px_4px_0_var(--color-ink)] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:[box-shadow:6px_6px_0_var(--color-ink)]"
    >
      <span className="border-ink bg-paper font-display text-house-pink grid h-8 w-8 shrink-0 place-items-center border-[1.5px] text-[26px] leading-none italic">
        +
      </span>
      <span>
        <span className="font-display block text-[19px] leading-[1.05] italic">
          โพสต์ขอความช่วยเหลือ
        </span>
        <small className="text-yellow mt-0.5 block font-mono text-[9px] tracking-[0.16em] uppercase not-italic">
          Post a request
        </small>
      </span>
    </Link>
  );
}
