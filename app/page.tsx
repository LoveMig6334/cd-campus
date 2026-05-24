import { BrandMark } from "@/components/layout/BrandMark";
import { cn } from "@/lib/cn";
import Link from "next/link";

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
        "group bg-paper border-line relative block border-[1.5px] p-6 sm:p-8",
        "transition-transform duration-150 ease-out",
        "hover:-translate-x-0.5 hover:-translate-y-0.5",
        "active:translate-x-0 active:translate-y-0",
        accent === "blue"
          ? "shadow-[5px_5px_0_var(--color-blue)] hover:shadow-[7px_7px_0_var(--color-blue)] active:shadow-[0_0_0_var(--color-blue)]"
          : "shadow-[5px_5px_0_var(--color-ink)] hover:shadow-[7px_7px_0_var(--color-ink)] active:shadow-[0_0_0_var(--color-ink)]",
      )}
    >
      <div
        className={cn(
          "border-line absolute top-0 right-0 h-16 w-24 border-b-[1.5px] border-l-[1.5px]",
          halftone,
        )}
        aria-hidden
      />
      <p className="text-mute-500 font-mono text-[11px] tracking-[0.22em] uppercase">
        {eyebrow}
      </p>
      <h2 className="font-display text-ink mt-3 text-4xl leading-[1.05] italic sm:text-5xl">
        {titleEn}
      </h2>
      <p className="font-display text-blue-deep mt-1 text-2xl leading-[1.1] italic sm:text-3xl">
        {titleTh}
      </p>
      <p className="text-mute-700 mt-5 max-w-[36ch] text-[13.5px] leading-[1.65]">
        {body}
      </p>
      <p className="text-ink mt-6 inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] uppercase">
        Enter view
        <span aria-hidden className="text-blue-deep">
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
            <p className="text-mute-500 font-mono text-[11px] tracking-[0.22em] uppercase">
              ★ Chitralada · 2026
            </p>
            <h1 className="font-display text-ink mt-2 text-5xl leading-[0.95] italic sm:text-7xl">
              CD Smart
              <br />
              <span className="text-blue-deep">Campus</span>
            </h1>
            <p className="font-display text-mute-700 mt-2 text-2xl italic sm:text-3xl">
              สมาร์ตแคมปัส จิตรลดา
            </p>
          </div>
          <BrandMark size={56} className="shrink-0" />
        </header>

        <div className="border-line mt-10 border-t-[1.5px] pt-6">
          <p className="text-mute-500 font-mono text-[11px] tracking-[0.22em] uppercase">
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

        <footer className="border-line mt-16 flex items-center justify-between border-t-[1.5px] pt-4">
          <p className="text-mute-500 font-mono text-[10px] tracking-[0.22em] uppercase">
            Prototype · Phase 0
          </p>
          <p className="text-mute-500 font-mono text-[10px] tracking-[0.22em] uppercase">
            Editorial Zine · Bilingual TH / EN
          </p>
        </footer>
      </div>
    </main>
  );
}
