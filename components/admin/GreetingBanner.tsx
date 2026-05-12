export function GreetingBanner({ th, en }: { th: string; en: string }) {
  return (
    <div className="font-display mb-4 text-[22px] italic">
      <span
        className="bg-blue px-2.5 py-0.5 text-white"
        style={{ boxShadow: "2px 2px 0 var(--color-yellow)" }}
      >
        {th}
      </span>
      <span className="text-mute-500 ml-2 text-[16px]">— {en}</span>
    </div>
  );
}
