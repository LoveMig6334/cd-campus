"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { bookRoom } from "@/app/student/booking/actions";
import type { ActionResult } from "@/lib/actions";

const INPUT_CLS =
  "border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[13px] normal-case tracking-normal text-ink";

type Props = {
  date: string;
  period: string;
  room: string;
  eyebrow: string;
};

// Module-level sentinel so reference equality distinguishes "never submitted"
// from "submitted and got back {ok: true}". useActionState only swaps the state
// reference when the action returns, so `state !== INITIAL && state.ok` is a
// reliable fresh-success check.
const INITIAL: ActionResult = { ok: true };

export function BookingConfirmForm({ date, period, room, eyebrow }: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(bookRoom, INITIAL);

  useEffect(() => {
    if (state !== INITIAL && state.ok) {
      // Drop ?date/?period/?room; the page reads ?ok=1 and renders the banner.
      router.replace("/student/booking?ok=1");
    }
  }, [state, router]);

  const disabled = !date || !period || !room || pending;

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="period" value={period} />
      <input type="hidden" name="room" value={room} />

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <label className="flex flex-col gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-mute-700">
          Name · ชื่อ
          <input name="name" type="text" required className={INPUT_CLS} />
        </label>
        <label className="flex flex-col gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-mute-700">
          Student ID · รหัส (4 หลัก)
          <input
            name="student_id_4"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            required
            className={INPUT_CLS}
          />
        </label>
        <label className="flex flex-col gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-mute-700">
          Class · ชั้น (optional)
          <input name="klass" type="text" maxLength={20} className={INPUT_CLS} />
        </label>
        <label className="flex flex-col gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-mute-700">
          Purpose · จุดประสงค์ (optional)
          <input name="purpose" type="text" maxLength={200} className={INPUT_CLS} />
        </label>
      </div>

      {!state.ok && (
        <p className="border-[1.5px] border-house-pink bg-house-pink/10 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-house-pink">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={disabled}
        className="w-full border-[1.5px] border-line bg-blue px-3 py-3.5 text-white transition-transform [box-shadow:4px_4px_0_var(--color-ink)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:[box-shadow:6px_6px_0_var(--color-ink)] active:translate-x-0.5 active:translate-y-0.5 active:[box-shadow:0_0_0_var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:[box-shadow:4px_4px_0_var(--color-ink)]"
      >
        <div className="font-display italic text-[19px]">
          {pending ? "Submitting…" : "Confirm Booking →"}
        </div>
        {eyebrow && (
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-yellow">
            {eyebrow}
          </div>
        )}
      </button>
    </form>
  );
}
