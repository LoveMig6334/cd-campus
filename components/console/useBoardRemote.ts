"use client";

import { useCallback, useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { BoardSoundId } from "@/lib/sport/boardSounds";

/**
 * Fires a sound on the hall board. Sends a Realtime broadcast over REST on
 * the kiosk's channel, so the console never has to hold a socket open.
 */
export function useBoardRemote() {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
      channelRef.current = null;
    };
  }, []);

  const playOnBoard = useCallback(async (id: BoardSoundId) => {
    if (channelRef.current === null) {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const channel = supabase.channel("rt-scoreboard");
      channelRef.current = channel;
      cleanupRef.current = () => void supabase.removeChannel(channel);
    }
    await channelRef.current.httpSend("sound", { id });
  }, []);

  return { playOnBoard };
}
