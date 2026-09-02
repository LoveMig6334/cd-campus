"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BOARD_SOUNDS, type BoardSoundId } from "@/lib/sport/boardSounds";

type AudioMap = Partial<Record<BoardSoundId, HTMLAudioElement>>;

/** Play-then-pause every element so the browser marks them as user-started. */
async function prime(map: AudioMap): Promise<boolean> {
  try {
    for (const el of Object.values(map)) {
      if (!el) continue;
      el.muted = true;
      await el.play();
      el.pause();
      el.currentTime = 0;
      el.muted = false;
    }
    return true;
  } catch {
    for (const el of Object.values(map)) {
      if (el) el.muted = false;
    }
    return false;
  }
}

/**
 * Preloads the hall-board sounds and plays them on the kiosk machine.
 * Browsers block audio until the page has seen a user gesture; `unlocked`
 * is false until the priming play succeeds (on load, or on the first tap).
 */
export function useBoardSounds() {
  const audioRef = useRef<AudioMap>({});
  const [unlocked, setUnlocked] = useState(true);

  useEffect(() => {
    const map: AudioMap = {};
    for (const s of BOARD_SOUNDS) {
      const el = new Audio(`/audio/${encodeURIComponent(s.file)}`);
      el.preload = "auto";
      map[s.id] = el;
    }
    audioRef.current = map;

    let disposed = false;
    const tryUnlock = () => {
      void prime(map).then((ok) => {
        if (disposed) return;
        setUnlocked(ok);
        if (ok) {
          window.removeEventListener("pointerdown", tryUnlock);
          window.removeEventListener("keydown", tryUnlock);
        }
      });
    };
    // Retry on any gesture until the browser lets audio through.
    window.addEventListener("pointerdown", tryUnlock);
    window.addEventListener("keydown", tryUnlock);
    tryUnlock();

    return () => {
      disposed = true;
      window.removeEventListener("pointerdown", tryUnlock);
      window.removeEventListener("keydown", tryUnlock);
      for (const el of Object.values(map)) el?.pause();
      audioRef.current = {};
    };
  }, []);

  const play = useCallback((id: BoardSoundId) => {
    const el = audioRef.current[id];
    if (!el) return;
    el.currentTime = 0;
    void el.play().catch(() => setUnlocked(false));
  }, []);

  return { play, unlocked };
}
