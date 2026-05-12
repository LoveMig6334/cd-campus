export function GreetingBanner({ th, en }: { th: string; en: string }) {
  return (
    <div className="mb-4 font-display italic text-[22px]">
      <span
        className="bg-blue px-2.5 py-0.5 text-white"
        style={{ boxShadow: "2px 2px 0 var(--color-yellow)" }}
      >
        {th}
      </span>
      <span className="ml-2 text-[16px] text-mute-500">— {en}</span>
    </div>
  );
}
