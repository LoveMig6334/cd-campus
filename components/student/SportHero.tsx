type Props = {
  label: string;
  title: string;
  meta: string;
};

export function SportHero({ label, title, meta }: Props) {
  return (
    <section className="relative overflow-hidden rounded-2xl border-[1.5px] border-line bg-blue p-[18px] text-white">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1.4px)",
          backgroundSize: "8px 8px",
        }}
      />
      <div className="relative font-mono text-[10px] uppercase tracking-[0.2em] text-yellow">
        {label}
      </div>
      <div className="relative mt-1 font-display italic text-[32px] leading-none">
        {title}
      </div>
      <div className="relative mt-1.5 font-mono text-[11px] tracking-[0.1em]">
        {meta.split(" · ").map((part, i, arr) => (
          <span key={i}>
            {part === "Live" ? <span className="text-yellow">Live</span> : part}
            {i < arr.length - 1 && " · "}
          </span>
        ))}
      </div>
    </section>
  );
}
