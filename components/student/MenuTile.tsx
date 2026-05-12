import Link from "next/link";
import type { ReactNode } from "react";
import { MenuStar } from "./MenuStar";

type Props = {
  href: string;
  labelEn: string;
  labelTh: string;
  star?: { color: "ink" | "yellow" | "blue" | "pink"; position: "tl" | "tr" };
  children: ReactNode;
};

export function MenuTile({ href, labelEn, labelTh, star, children }: Props) {
  return (
    <Link
      href={href}
      className="group border-line bg-paper relative flex aspect-square flex-col overflow-hidden rounded border-[1.5px] transition-transform duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:[box-shadow:4px_4px_0_var(--color-blue)]"
    >
      {star && <MenuStar color={star.color} position={star.position} />}
      <div className="bg-cream relative flex-1">
        <span
          aria-hidden
          className="halftone-soft pointer-events-none absolute inset-0 opacity-50"
        />
        <div className="absolute inset-0 grid place-items-center">
          <div className="relative z-[1] aspect-square w-[54%]">{children}</div>
        </div>
      </div>
      <div className="bg-blue font-display px-2.5 pt-[7px] pb-[9px] text-center text-[17px] leading-none text-white italic">
        {labelEn}
        <small className="text-yellow mt-0.5 block font-mono text-[8.5px] tracking-[0.18em] uppercase not-italic">
          {labelTh}
        </small>
      </div>
    </Link>
  );
}
