"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/lib/actions";
import { postCarelinRequest } from "@/app/student/carelin/actions";

const INITIAL: ActionResult = { ok: true };

export function CarelinForm() {
  const [state, action, pending] = useActionState(postCarelinRequest, INITIAL);
  return (
    <form action={action} className="space-y-3.5">
      <label className="block">
        <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
          Title · เรื่อง
        </span>
        <input
          name="title"
          type="text"
          required
          maxLength={120}
          className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[14px] text-ink"
        />
      </label>

      <label className="block">
        <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
          Body · รายละเอียด
        </span>
        <textarea
          name="body"
          required
          rows={5}
          className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[14px] text-ink"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
            Name · ชื่อ
          </span>
          <input
            name="who_name"
            type="text"
            required
            maxLength={60}
            className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[14px] text-ink"
          />
        </label>

        <label className="block">
          <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
            Student ID · รหัส (4 หลัก)
          </span>
          <input
            name="student_id_4"
            type="text"
            required
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[14px] text-ink"
          />
        </label>
      </div>

      <label className="block">
        <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-mute-700">
          Class · ชั้น (optional)
        </span>
        <input
          name="klass"
          type="text"
          maxLength={20}
          placeholder="ม.5/2"
          className="mt-1 w-full border-[1.5px] border-line bg-paper px-3 py-2 font-sans text-[14px] text-ink"
        />
      </label>

      {!state.ok && (
        <p className="border-[1.5px] border-house-pink bg-house-pink/10 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-house-pink">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full border-[1.5px] border-line bg-blue px-4 py-3 font-display italic text-[18px] text-yellow [box-shadow:4px_4px_0_var(--color-ink)] disabled:opacity-60"
      >
        {pending ? "Posting…" : "Post request → ส่งคำขอ"}
      </button>
    </form>
  );
}
