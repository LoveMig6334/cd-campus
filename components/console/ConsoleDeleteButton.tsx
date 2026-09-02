"use client";

import { useEffect, useState, useTransition } from "react";
import { deleteMatch } from "@/app/admin/scoreboard/actions";
import { Button } from "@/components/console/ui";

export function ConsoleDeleteButton({
  id,
  summary,
  scoreline,
}: {
  id: string;
  summary: string;
  scoreline: string;
}) {
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Delete ${summary}`}
        className="cursor-pointer rounded-lg px-2 py-1 text-[13px] text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
      >
        Delete
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-busy={isPending}
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4"
          onClick={() => !isPending && setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="text-marine text-[20px] font-semibold">
              ลบผลการแข่งขัน?
            </div>
            <div className="text-[13px] text-gray-500">Delete match?</div>
            <div className="my-4 rounded-xl bg-gray-50 px-4 py-3">
              <div className="text-[14px] font-medium text-gray-900">
                {summary}
              </div>
              <div className="text-[12px] text-gray-500 tabular-nums">
                {scoreline}
              </div>
            </div>
            <p className="text-[12px] text-gray-500">
              Removes the result and its audit log. This cannot be undone.
            </p>
            {error && <p className="mt-2 text-[13px] text-red-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirm}
                disabled={isPending}
                aria-busy={isPending}
              >
                {isPending ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
