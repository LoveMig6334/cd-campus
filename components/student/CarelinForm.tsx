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
        <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
          Title · เรื่อง
        </span>
        <input
          name="title"
          type="text"
          required
          maxLength={120}
          className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
        />
      </label>

      <label className="block">
        <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
          Body · รายละเอียด
        </span>
        <textarea
          name="body"
          required
          rows={5}
          className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
            Name · ชื่อ
          </span>
          <input
            name="who_name"
            type="text"
            required
            maxLength={60}
            className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
          />
        </label>

        <label className="block">
          <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
            Student ID · รหัส (4 หลัก)
          </span>
          <input
            name="student_id_4"
            type="text"
            required
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
          Class · ชั้น (optional)
        </span>
        <input
          name="klass"
          type="text"
          maxLength={20}
          placeholder="ม.5/2"
          className="border-line bg-paper text-ink mt-1 w-full border-[1.5px] px-3 py-2 font-sans text-[14px]"
        />
      </label>

      {!state.ok && (
        <p className="border-house-pink bg-house-pink/10 text-house-pink border-[1.5px] px-3 py-2 font-mono text-[11px] tracking-[0.1em] uppercase">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="border-line bg-blue font-display text-yellow w-full border-[1.5px] px-4 py-3 text-[18px] italic [box-shadow:4px_4px_0_var(--color-ink)] disabled:opacity-60"
      >
        {pending ? "Posting…" : "Post request → ส่งคำขอ"}
      </button>
    </form>
  );
}
