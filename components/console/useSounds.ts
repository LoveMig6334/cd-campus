"use client";

import { useCallback, useEffect, useRef } from "react";

/** Operator sounds, served from public/audio/. */
export const SOUNDS = [
  {
    id: "buzzer",
    labelEn: "Buzzer",
    labelTh: "เสียงหมดเวลา",
    file: "end_q.mp3",
  },
  {
    id: "shot",
    labelEn: "Shot clock",
    labelTh: "ช็อตคล็อก",
    file: "short clock.mp3",
  },
] as const;

export type SoundId = (typeof SOUNDS)[number]["id"];

/**
 * Preloads the console sounds and plays them from the operator's device
 * (the kiosk browser blocks autoplay, so audio lives here). Playing a sound
 * that is already playing restarts it.
 */
export function useSounds() {
  const audioRef = useRef<Partial<Record<SoundId, HTMLAudioElement>>>({});

  useEffect(() => {
    const map: Partial<Record<SoundId, HTMLAudioElement>> = {};
    for (const s of SOUNDS) {
      const el = new Audio(`/audio/${encodeURIComponent(s.file)}`);
      el.preload = "auto";
      map[s.id] = el;
    }
    audioRef.current = map;
    return () => {
      for (const el of Object.values(map)) el?.pause();
      audioRef.current = {};
    };
  }, []);

  const play = useCallback((id: SoundId) => {
    const el = audioRef.current[id];
    if (!el) return;
    el.currentTime = 0;
    // Autoplay policy can reject until the operator has interacted; ignore.
    void el.play().catch(() => {});
  }, []);

  return { play };
}
