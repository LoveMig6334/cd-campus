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
      className="border-[1.5px] border-line bg-paper p-5"
      style={{ boxShadow: "4px 4px 0 var(--color-ink)" }}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-mute-500">
        ★ Stub · Phase 1
      </p>
      <h1 className="mt-1 font-display italic text-[28px] leading-[1.05]">
        {titleEn}
      </h1>
      <p className="mt-0.5 font-display italic text-[18px] text-blue">
        {titleTh}
      </p>
      <p className="mt-3 text-[13px] leading-[1.6] text-mute-700">{note}</p>
    </section>
  );
}
