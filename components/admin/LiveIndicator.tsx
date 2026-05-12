export function LiveIndicator({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-house-green">
      <span
        aria-hidden
        className="inline-block h-2 w-2 animate-pulse rounded-full bg-house-green"
      />
      {label}
    </span>
  );
}
