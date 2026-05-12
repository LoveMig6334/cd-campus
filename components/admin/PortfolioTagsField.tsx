"use client";

import { useState } from "react";
import type { PortfolioTagPill } from "@/lib/types";
import { TAG_SWATCHES, type TagSwatchId } from "@/lib/ui/portfolio";

function pillFromSwatch(
  label: string,
  swatchId: TagSwatchId,
): PortfolioTagPill {
  const swatch = TAG_SWATCHES.find((s) => s.id === swatchId)!;
  return swatch.id === "yellow"
    ? {
        label,
        background: swatch.background,
        textColor: "var(--color-ink)",
      }
    : { label, background: swatch.background };
}

function swatchIdFromBackground(background: string): TagSwatchId {
  return (
    (TAG_SWATCHES.find((s) => s.background === background)
      ?.id as TagSwatchId) ?? "blue"
  );
}

export function PortfolioTagsField({
  initialTags,
}: {
  initialTags: PortfolioTagPill[];
}) {
  const [tags, setTags] = useState<PortfolioTagPill[]>(initialTags);

  const updateLabel = (i: number, label: string) => {
    setTags((prev) => prev.map((t, idx) => (idx === i ? { ...t, label } : t)));
  };
  const updateSwatch = (i: number, swatchId: TagSwatchId) => {
    setTags((prev) =>
      prev.map((t, idx) => (idx === i ? pillFromSwatch(t.label, swatchId) : t)),
    );
  };
  const remove = (i: number) => {
    setTags((prev) => prev.filter((_, idx) => idx !== i));
  };
  const add = () => {
    setTags((prev) => [...prev, pillFromSwatch("", "blue")]);
  };

  return (
    <div className="md:col-span-2">
      <span className="text-mute-700 block font-mono text-[10px] tracking-[0.16em] uppercase">
        Tags
      </span>
      <input type="hidden" name="tags" value={JSON.stringify(tags)} />
      <ul className="mt-1 space-y-1.5">
        {tags.map((t, i) => {
          const activeId = swatchIdFromBackground(t.background);
          return (
            <li
              key={i}
              className="border-line bg-paper flex items-center gap-2 border-[1.5px] px-2 py-1.5"
            >
              <input
                type="text"
                value={t.label}
                onChange={(e) => updateLabel(i, e.target.value)}
                placeholder="Tag label"
                className="text-ink flex-1 bg-transparent px-1 py-1 font-sans text-[13px] outline-none"
              />
              <div className="flex items-center gap-1">
                {TAG_SWATCHES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => updateSwatch(i, s.id)}
                    aria-label={s.label}
                    aria-pressed={s.id === activeId}
                    className={
                      "h-5 w-5 border-[1.5px] " +
                      (s.id === activeId
                        ? "border-ink"
                        : "border-line opacity-60 hover:opacity-100")
                    }
                    style={{ background: s.background }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Remove tag"
                className="text-mute-500 hover:text-house-pink ml-1 font-mono text-[12px]"
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={add}
        className="border-line bg-paper text-mute-700 hover:bg-cream mt-1.5 inline-block border-[1.5px] px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase"
      >
        + Add tag
      </button>
    </div>
  );
}
