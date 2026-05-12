import type { GanttBar, GanttBarVariant, GanttRoom } from "@/lib/types";
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
    <div className="border-line bg-cream overflow-x-auto border-[1.5px] p-3.5">
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
        "border-ink bg-paper text-mute-500 border-b-[1.5px] px-2.5 py-2 font-mono text-[10px] tracking-[0.1em] uppercase",
        !last && "border-mute-300 border-r border-dashed",
      )}
    >
      {children}
    </div>
  );
}

function Row({ room }: { room: GanttRoom }) {
  return (
    <>
      <div className="border-mute-300 border-r-ink bg-paper font-display border-r-[1.5px] border-b border-dashed px-2.5 py-4 text-[15px] italic">
        {room.nameEn}
        <small className="text-mute-500 mt-0.5 block font-mono text-[9px] tracking-[0.14em] uppercase not-italic">
          {room.nameTh}
        </small>
      </div>
      <div className="border-mute-300 bg-paper relative col-span-10 h-16 overflow-hidden border-b border-dashed">
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
        "border-ink absolute top-2 bottom-2 flex flex-col justify-center overflow-hidden border-[1.5px] px-2 py-1.5 font-mono text-[10px] leading-[1.1] [box-shadow:2px_2px_0_var(--color-ink)]",
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
