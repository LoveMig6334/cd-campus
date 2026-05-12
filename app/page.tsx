import Link from "next/link";
import { BrandMark } from "@/components/layout/BrandMark";
import { cn } from "@/lib/cn";

type ViewCardProps = {
  href: string;
  eyebrow: string;
  titleEn: string;
  titleTh: string;
  body: string;
  accent: "blue" | "ink";
  halftone: "halftone-bk" | "halftone-bl";
};

function ViewCard({
  href,
  eyebrow,
  titleEn,
  titleTh,
  body,
  accent,
  halftone,
}: ViewCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative block bg-paper border-[1.5px] border-line p-6 sm:p-8",
        "transition-transform duration-150 ease-out",
        "hover:-translate-x-[2px] hover:-translate-y-[2px]",
        "active:translate-x-0 active:translate-y-0",
        accent === "blue"
          ? "shadow-[5px_5px_0_var(--color-blue)] hover:shadow-[7px_7px_0_var(--color-blue)] active:shadow-[0_0_0_var(--color-blue)]"
          : "shadow-[5px_5px_0_var(--color-ink)] hover:shadow-[7px_7px_0_var(--color-ink)] active:shadow-[0_0_0_var(--color-ink)]",
      )}
    >
      <div
        className={cn(
          "absolute right-0 top-0 h-16 w-24 border-l-[1.5px] border-b-[1.5px] border-line",
          halftone,
        )}
        aria-hidden
      />
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mute-500">
        {eyebrow}
      </p>
      <h2 className="font-display italic text-4xl sm:text-5xl leading-[1.05] mt-3 text-ink">
        {titleEn}
      </h2>
      <p className="font-display italic text-2xl sm:text-3xl leading-[1.1] mt-1 text-blue">
        {titleTh}
      </p>
      <p className="mt-5 text-[13.5px] leading-[1.65] text-mute-700 max-w-[36ch]">
        {body}
      </p>
      <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-ink inline-flex items-center gap-2">
        Enter view
        <span aria-hidden className="text-blue">
          →
        </span>
      </p>
    </Link>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen px-5 py-12 sm:px-10 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mute-500">
              ★ Chitralada · 2026
            </p>
            <h1 className="font-display italic text-5xl sm:text-7xl leading-[0.95] mt-2 text-ink">
              CD Smart
              <br />
              <span className="text-blue">Campus</span>
            </h1>
            <p className="font-display italic text-2xl sm:text-3xl mt-2 text-mute-700">
              สมาร์ตแคมปัส จิตรลดา
            </p>
          </div>
          <BrandMark size={56} className="shrink-0" />
        </header>

        <div className="mt-10 border-t-[1.5px] border-line pt-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mute-500">
            ⚡ Choose a view · เลือกมุมมอง
          </p>
        </div>

        <section className="mt-6 grid gap-6 sm:grid-cols-2">
          <ViewCard
            href="/student"
            eyebrow="01 · Student / Mobile"
            titleEn="For students"
            titleTh="สำหรับนักเรียน"
            body="Phone shell with the date header, six-tile menu, calendar, sport day, room booking, portfolios, P'share, and CD Carelin."
            accent="blue"
            halftone="halftone-bl"
          />
          <ViewCard
            href="/admin"
            eyebrow="02 · Admin / Desktop"
            titleEn="For staff"
            titleTh="สำหรับผู้ดูแล"
            body="Sidebar shell with overview KPIs, bookings, portfolio review, P'share Studio, and the Carelin Desk triage."
            accent="ink"
            halftone="halftone-bk"
          />
        </section>

        <footer className="mt-16 flex items-center justify-between border-t-[1.5px] border-line pt-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-mute-500">
            Prototype · Phase 0
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-mute-500">
            Editorial Zine · Bilingual TH / EN
          </p>
        </footer>
      </div>
    </main>
  );
}
