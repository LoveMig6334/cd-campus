"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  initialCourts,
  parseCourts,
  type CourtsState,
} from "@/lib/sport/badminton";

// Both courts live in this browser's localStorage; the `storage` event keeps
// the board window and the control window in sync on the same machine.
const KEY = "cd-badminton-courts-v1";
const SERVER_SNAPSHOT = initialCourts();
const listeners = new Set<() => void>();

let cache: { raw: string | null; value: CourtsState } = {
  raw: null,
  value: SERVER_SNAPSHOT,
};

function readRaw(): string | null | undefined {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return undefined; // storage blocked — keep the in-memory state
  }
}

function getSnapshot(): CourtsState {
  const raw = readRaw();
  if (raw === undefined || raw === cache.raw) return cache.value;
  cache = { raw, value: parseCourts(raw) };
  return cache.value;
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function write(next: CourtsState) {
  const raw = JSON.stringify(next);
  cache = { raw, value: next };
  try {
    window.localStorage.setItem(KEY, raw);
  } catch {
    // Private mode / quota: this window still updates from the cache.
  }
  listeners.forEach((cb) => cb());
}

/** Both courts plus an updater; `ready` is false until storage is read. */
export function useBadmintonCourts() {
  const state = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => SERVER_SNAPSHOT,
  );
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const update = useCallback((fn: (s: CourtsState) => CourtsState) => {
    const prev = getSnapshot();
    const next = fn(prev);
    if (next !== prev) write(next);
  }, []);
  return { state, update, ready };
}

/** Wall-clock ms, ticking every `ms`; 0 until mounted (no SSR mismatch). */
export function useNow(ms = 250): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, ms);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [ms]);
  return now;
}
