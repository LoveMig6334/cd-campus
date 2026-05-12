import type { GanttBar, GanttBarVariant, GanttRoom } from "@/data/types";
import { cn } from "@/lib/cn";

const BAR_VARIANT: Record<GanttBarVariant, string> = {
  default: "bg-blue text-white",
  y: "bg-yellow text-ink",
  p: "bg-house-purple text-white",
  g: "bg-house-green text-white",
  o: "bg-house-orange text-white",
};

export function Gantt({
  hours,
  rooms,
}: {
  hours: readonly string[];
  rooms: GanttRoom[];
}) {
  return (
    <div className="overflow-x-auto border-[1.5px] border-line bg-cream p-3.5">
      <div className="grid min-w-[760px] grid-cols-[160px_repeat(10,1fr)]">
        <HeadCell>Room</HeadCell>
        {hours.map((h, i) => (
          <HeadCell key={h} last={i === hours.length - 1}>
            {h}
          </HeadCell>
        ))}
        {rooms.map((room) => (
          <Row key={room.nameEn} room={room} />
        ))}
      </div>
    </div>
  );
}

function HeadCell({
  children,
  last,
}: {
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-b-[1.5px] border-ink bg-paper px-2.5 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-mute-500",
        !last && "border-r border-dashed border-mute-300",
      )}
    >
      {children}
    </div>
  );
}

function Row({ room }: { room: GanttRoom }) {
  return (
    <>
      <div className="border-r-[1.5px] border-b border-dashed border-mute-300 border-r-ink bg-paper px-2.5 py-4 font-display italic text-[15px]">
        {room.nameEn}
        <small className="mt-0.5 block font-mono text-[9px] not-italic uppercase tracking-[0.14em] text-mute-500">
          {room.nameTh}
        </small>
      </div>
      <div className="relative col-span-10 h-16 border-b border-dashed border-mute-300 bg-paper">
        {room.bars.map((bar, i) => (
          <Bar key={i} bar={bar} />
        ))}
      </div>
    </>
  );
}

function Bar({ bar }: { bar: GanttBar }) {
  const variant = bar.variant ?? "default";
  return (
    <div
      className={cn(
        "absolute top-2 bottom-2 flex flex-col justify-center overflow-hidden border-[1.5px] border-ink px-2 py-1.5 font-mono text-[10px] leading-[1.1] [box-shadow:2px_2px_0_var(--color-ink)]",
        BAR_VARIANT[variant],
      )}
      style={{ left: `${bar.leftPct}%`, width: `${bar.widthPct}%` }}
    >
      <strong className="font-display text-[13px] font-normal italic">
        {bar.who}
      </strong>
      {bar.meta}
    </div>
  );
}
