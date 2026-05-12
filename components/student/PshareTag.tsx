export function PshareTag({ tag }: { tag: string }) {
  return (
    <span className="inline-block border border-ink bg-cream px-1.5 py-0.5 font-mono text-[9px] tracking-[0.04em] text-ink">
      {tag}
    </span>
  );
}
