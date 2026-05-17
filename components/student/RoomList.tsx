import Link from "next/link";
import type { Room } from "@/lib/types";
import { cn } from "@/lib/cn";

export function RoomList({ rooms }: { rooms: Room[] }) {
  return (
    <div className="border-line bg-paper overflow-hidden rounded-[10px] border-[1.5px]">
      {rooms.map((room, i) => {
        const cls = cn(
          "flex w-full items-center justify-between px-3.5 py-3 text-left transition-colors hover:bg-cream",
          i < rooms.length - 1 && "border-b border-dashed border-mute-200",
          room.selected && "bg-yellow hover:bg-yellow",
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
          return (
            <Link key={room.id} href={room.href} className={cls}>
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
