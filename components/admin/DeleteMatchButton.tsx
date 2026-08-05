"use client";

import { useEffect, useState, useTransition } from "react";
import { Btn } from "@/components/admin/Btn";
import { deleteMatch } from "@/app/admin/scoreboard/actions";

type Props = {
  id: string;
  /** e.g. "Volleyball — Green vs Purple" */
  summary: string;
  /** e.g. "2–1 · 15–12, 10–15, 15–13" */
  scoreline: string;
};

export function DeleteMatchButton({ id, summary, scoreline }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !isPending) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, isPending]);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("id", id);
        await deleteMatch(fd);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to delete match.");
      }
    });
  }

  return (
    <>
      <Btn
        type="button"
        onClick={() => setOpen(true)}
        className="text-mute-700 px-2 py-1 text-[10px]"
        aria-label={`Delete ${summary}`}
      >
        ✕
      </Btn>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-busy={isPending}
          className="bg-ink/55 fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => !isPending && setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="border-line bg-paper relative w-full max-w-sm border-[1.5px] px-5 py-[18px] [box-shadow:5px_5px_0_var(--color-blue)]"
          >
            <div className="mb-3 flex items-baseline gap-2.5">
              <span className="font-display text-[24px] leading-none italic">
                ลบผลการแข่งขัน?
              </span>
              <span className="text-mute-500 font-mono text-[10px] tracking-[0.18em] uppercase">
                Delete match?
              </span>
            </div>
            <div className="border-line mb-3 border-y border-dashed py-2.5">
              <div className="font-display text-[17px] leading-tight italic">
                {summary}
              </div>
              <div className="text-mute-700 font-mono text-[11px] tabular-nums">
                {scoreline}
              </div>
            </div>
            <p className="text-mute-700 mb-4 font-mono text-[10px] tracking-[0.14em] uppercase">
              Removes the result and its audit log. This cannot be undone.
            </p>
            {error && (
              <p className="text-blue-deep mb-3 font-mono text-[11px] tracking-[0.04em]">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Btn
                type="button"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className={isPending ? "opacity-50" : ""}
              >
                Cancel
              </Btn>
              <Btn
                type="button"
                variant="ink"
                onClick={handleConfirm}
                disabled={isPending}
                aria-busy={isPending}
              >
                {isPending ? "Deleting…" : "Delete"}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
