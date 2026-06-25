"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Props = {
  /** Tables to watch for postgres_changes. */
  tables: readonly string[];
  /** Stable channel name. */
  channelKey: string;
};

/**
 * Subscribes to postgres_changes on the given tables and calls
 * router.refresh() (debounced) on each event. Returns null — pure side-effect
 * leaf. RLS on the underlying tables is the gate for which events arrive.
 */
export function RealtimeRefresh({ tables, channelKey }: Props) {
  const router = useRouter();
  const tablesKey = tables.join("|");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Load the Supabase client lazily so @supabase/{ssr,supabase-js,realtime}
    // (~62 KB gz) stays off the route's first-load JS — it's only needed
    // post-hydration to open the realtime channel.
    let cancelled = false;
    let teardown: (() => void) | null = null;

    void (async () => {
      const { createClient } = await import("@/lib/supabase/client");
      if (cancelled) return;
      const supabase = createClient();
      const channel = supabase.channel(channelKey);
      for (const table of tablesKey.split("|")) {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          () => {
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => router.refresh(), 1200);
          },
        );
      }
      channel.subscribe();
      teardown = () => void supabase.removeChannel(channel);
    })();

    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
      teardown?.();
    };
  }, [channelKey, tablesKey, router]);

  return null;
}
