"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

    return () => {
      if (timer.current) clearTimeout(timer.current);
      void supabase.removeChannel(channel);
    };
  }, [channelKey, tablesKey, router]);

  return null;
}
