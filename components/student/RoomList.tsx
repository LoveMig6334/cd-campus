import Link from "next/link";
import type { Room } from "@/lib/types";
import { cn } from "@/lib/cn";

export function RoomList({
  rooms,
  selectedId,
  onSelect,
}: {
  rooms: Room[];
  /** Booking: optimistically-selected room id — drives the highlight
   *  client-side, overriding the server-baked `selected`. */
  selectedId?: string;
  /** Booking: select via client navigation instead of a Link. */
  onSelect?: (id: string, href: string) => void;
}) {
  return (
    <div className="border-line bg-paper overflow-hidden rounded-[10px] border-[1.5px]">
      {rooms.map((room, i) => {
        const selected =
          selectedId !== undefined ? room.id === selectedId : room.selected;
        const cls = cn(
          "flex w-full items-center justify-between px-3.5 py-3 text-left transition-colors hover:bg-cream",
          i < rooms.length - 1 && "border-b border-dashed border-mute-200",
          selected && "bg-yellow hover:bg-yellow",
        );
        const inner = (
          <>
            <div>
              <div className="font-display text-[17px] leading-none italic">
                {room.nameEn}
              </div>
              {room.nameTh && (
                <div className="text-mute-500 mt-0.5 font-mono text-[9px] tracking-[0.14em] uppercase">
                  {room.nameTh}
                </div>
              )}
            </div>
            <span
              className={cn(
                "border-ink rounded-full border px-2 py-1 font-mono text-[10px] text-white",
                room.status === "free"
                  ? "bg-house-green border-house-green"
                  : "bg-house-pink border-house-pink",
              )}
            >
              {room.status === "free" ? "Free" : "Full"}
            </span>
          </>
        );

        if (room.href) {
          // Booking interactive mode: client-side select for an instant highlight.
          if (onSelect) {
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => onSelect(room.id, room.href!)}
                className={cn(cls, "cursor-pointer")}
              >
                {inner}
              </button>
            );
          }
          // No prefetch — dynamic booking route, prefetch only adds load.
          return (
            <Link
              key={room.id}
              href={room.href}
              prefetch={false}
              className={cn(cls, "cursor-pointer")}
            >
              {inner}
            </Link>
          );
        }

        return (
          <button key={room.id} type="button" className={cls}>
            {inner}
          </button>
        );
      })}
    </div>
  );
}
