"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { searchUnsplash, type UnsplashPhoto } from "./unsplash";

const UTM = "?utm_source=cd-campus&utm_medium=referral";

export function UnsplashPicker() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UnsplashPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [picked, setPicked] = useState<UnsplashPhoto | null>(null);
  const [isSearching, startSearch] = useTransition();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function runSearch() {
    setError(null);
    startSearch(async () => {
      const data = await searchUnsplash(query);
      setSearched(true);
      if (data.ok) {
        setResults(data.photos);
      } else {
        setResults([]);
        setError(data.error);
      }
    });
  }

  function pick(p: UnsplashPhoto) {
    setPicked(p);
    setOpen(false);
  }

  return (
    <>
      <input type="hidden" name="image_url" value={picked?.fullUrl ?? ""} />
      <input
        type="hidden"
        name="image_download_location"
        value={picked?.downloadLocation ?? ""}
      />

      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="border-line bg-paper text-ink hover:bg-cream border-[1.5px] px-3 py-2 font-mono text-[10px] tracking-[0.12em] uppercase"
        >
          Pick from Unsplash
        </button>
        {picked && (
          <div className="border-line bg-paper flex items-center gap-2 border-[1.5px] px-2 py-1.5">
            <Image
              src={picked.thumbUrl}
              alt={picked.alt}
              width={56}
              height={36}
              unoptimized
              className="h-9 w-14 object-cover"
            />
            <span className="text-mute-700 font-mono text-[10px]">
              by{" "}
              <a
                href={`${picked.photographerUrl}${UTM}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue underline"
              >
                {picked.photographer}
              </a>
            </span>
            <button
              type="button"
              onClick={() => setPicked(null)}
              className="border-line bg-paper text-mute-700 border-[1.5px] px-1.5 py-0.5 font-mono text-[10px] tracking-[0.12em] uppercase"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="bg-ink/55 fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="border-line bg-paper relative my-8 w-full max-w-3xl border-[1.5px] px-5 py-[18px] [box-shadow:5px_5px_0_var(--color-blue)]"
          >
            <div className="mb-3 flex items-baseline gap-2.5">
              <span className="font-display text-[24px] leading-none italic">
                เลือกภาพจาก Unsplash
              </span>
              <span className="text-mute-500 font-mono text-[10px] tracking-[0.18em] uppercase">
                Search Unsplash
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-mute-700 ml-auto font-mono text-[14px] leading-none"
              >
                ✕
              </button>
            </div>

            <div className="mb-3 flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    runSearch();
                  }
                }}
                placeholder="e.g. campus, library, music"
                autoFocus
                className="border-line bg-paper text-ink flex-1 border-[1.5px] px-3 py-2 font-sans text-[13px]"
              />
              <button
                type="button"
                onClick={runSearch}
                disabled={isSearching || !query.trim()}
                className="border-line bg-blue hover:bg-blue-deep border-[1.5px] px-4 py-2 font-mono text-[11px] tracking-[0.12em] text-white uppercase disabled:opacity-50"
              >
                {isSearching ? "Searching…" : "Search"}
              </button>
            </div>

            {error && (
              <p className="text-blue mb-3 font-mono text-[11px]">{error}</p>
            )}

            {!error && searched && !isSearching && results.length === 0 && (
              <p className="text-mute-500 font-mono text-[11px] tracking-[0.12em] uppercase">
                No results.
              </p>
            )}

            {!error && !searched && (
              <p className="text-mute-500 font-mono text-[11px] tracking-[0.12em] uppercase">
                Type a query and press Search.
              </p>
            )}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pick(p)}
                  title={p.alt || p.photographer}
                  className="border-line bg-paper relative block aspect-[5/3] overflow-hidden border-[1.5px] text-left transition-all hover:-translate-x-px hover:-translate-y-px hover:[box-shadow:3px_3px_0_var(--color-blue)]"
                >
                  <Image
                    src={p.thumbUrl}
                    alt={p.alt}
                    fill
                    sizes="240px"
                    unoptimized
                    className="object-cover"
                  />
                  <span className="bg-ink/70 absolute right-0 bottom-0 left-0 truncate px-1.5 py-0.5 font-mono text-[10px] text-white">
                    {p.photographer}
                  </span>
                </button>
              ))}
            </div>

            <p className="text-mute-500 mt-3 font-mono text-[10px] tracking-[0.12em] uppercase">
              Photos by{" "}
              <a
                href={`https://unsplash.com${UTM}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue underline"
              >
                Unsplash
              </a>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
