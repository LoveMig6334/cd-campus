import Link from "next/link";
import { MobileBody } from "@/components/layout/MobileBody";
import { StudentHeader } from "@/components/layout/StudentHeader";
import { FEATURE_LABELS, type FeatureKey } from "@/lib/ui/features";

export function FeatureUnavailable({ feature }: { feature: FeatureKey }) {
  const label = FEATURE_LABELS[feature];
  return (
    <>
      <StudentHeader />
      <MobileBody className="flex flex-1 flex-col justify-center">
        <div className="border-line bg-paper relative overflow-hidden border-[1.5px] px-5 py-7 text-center">
          <span
            aria-hidden
            className="halftone-soft pointer-events-none absolute inset-0 opacity-40"
          />
          <div className="relative">
            <div className="text-mute-500 font-mono text-[10px] tracking-[0.2em] uppercase">
              {label.en}
            </div>
            <div className="font-display mt-2 text-[28px] leading-[1.05] italic">
              ฟีเจอร์นี้ยังไม่เปิดให้บริการ
            </div>
            <Link
              href="/student"
              className="border-line bg-blue mt-5 inline-block border-[1.5px] px-4 py-2.5 font-mono text-[11px] tracking-[0.12em] text-white uppercase [box-shadow:3px_3px_0_var(--color-ink)] hover:-translate-x-px hover:-translate-y-px hover:[box-shadow:4px_4px_0_var(--color-ink)]"
            >
              ← Back to menu · กลับเมนู
            </Link>
          </div>
        </div>
      </MobileBody>
    </>
  );
}
