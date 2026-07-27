import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryClient";

/**
 * Live multi-device sync. Any insert/update/delete on appointments (or clients)
 * invalidates the matching caches, so the owner and all employees see the same
 * agenda instantly — including admin reassignments.
 *
 * Requires Realtime to be enabled for these tables in the Supabase dashboard
 * (Database → Replication). Without it the app still works via refetch-on-focus.
 */
export function useRealtime(enabled: boolean) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel("esb-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => {
        // `refetchType: "active"` marks every cached day/month stale but only
        // re-fetches what is currently on screen; other days refresh lazily
        // when revisited instead of firing a burst of requests.
        qc.invalidateQueries({ queryKey: queryKeys.appointments, refetchType: "active" });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.clients, refetchType: "active" });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, qc]);
}
