export function PshareTag({ tag }: { tag: string }) {
  return (
    <span className="border-ink bg-cream text-ink inline-block border px-1.5 py-0.5 font-mono text-[9px] tracking-[0.04em]">
      {tag}
    </span>
  );
}
