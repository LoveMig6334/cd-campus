type StubCardProps = {
  titleEn: string;
  titleTh: string;
  note?: string;
};

export function StubCard({
  titleEn,
  titleTh,
  note = "Phase 2 ports this page from the prototype.",
}: StubCardProps) {
  return (
    <section
      className="border-line bg-paper border-[1.5px] p-5"
      style={{ boxShadow: "4px 4px 0 var(--color-ink)" }}
    >
      <p className="text-mute-500 font-mono text-[10px] tracking-[0.22em] uppercase">
        ★ Stub · Phase 1
      </p>
      <h1 className="font-display mt-1 text-[28px] leading-[1.05] italic">
        {titleEn}
      </h1>
      <p className="font-display text-blue mt-0.5 text-[18px] italic">
        {titleTh}
      </p>
      <p className="text-mute-700 mt-3 text-[13px] leading-[1.6]">{note}</p>
    </section>
  );
}
