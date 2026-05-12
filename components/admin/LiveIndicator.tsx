export function LiveIndicator({ label }: { label: string }) {
  return (
    <span className="text-house-green inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.12em] uppercase">
      <span
        aria-hidden
        className="bg-house-green inline-block h-2 w-2 animate-pulse rounded-full"
      />
      {label}
    </span>
  );
}
