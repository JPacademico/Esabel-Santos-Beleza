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
        qc.invalidateQueries({ queryKey: queryKeys.appointments });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, () => {
        qc.invalidateQueries({ queryKey: queryKeys.clients });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, qc]);
}
