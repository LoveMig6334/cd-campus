export default function AdminLoading() {
  return (
    <div className="animate-pulse">
      <div className="border-line bg-paper mb-[18px] flex items-center justify-between border-[1.5px] px-5 py-4 [box-shadow:3px_3px_0_var(--color-ink)]">
        <div className="space-y-1.5">
          <div className="bg-mute-200 h-3 w-32" />
          <div className="bg-mute-300 h-5 w-48" />
        </div>
        <div className="flex gap-2">
          <div className="border-line bg-cream h-9 w-24 border-[1.5px]" />
          <div className="border-line bg-cream h-9 w-24 border-[1.5px]" />
        </div>
      </div>

      <div className="mb-[22px] grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="border-line bg-paper h-24 border-[1.5px] [box-shadow:3px_3px_0_var(--color-ink)]"
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[2fr_1fr]">
        <div className="border-line bg-paper h-72 border-[1.5px] [box-shadow:3px_3px_0_var(--color-ink)]" />
        <div className="border-line bg-paper h-72 border-[1.5px] [box-shadow:3px_3px_0_var(--color-ink)]" />
      </div>

      <div className="border-line bg-paper mt-[18px] h-64 border-[1.5px] [box-shadow:3px_3px_0_var(--color-ink)]" />
    </div>
  );
}
