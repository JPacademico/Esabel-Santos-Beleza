import { useEffect, useState } from "react";

/**
 * A Date that refreshes on an interval, so appointments flip to "Concluído"
 * as time passes without any server round-trip or database write.
 */
export function useNowTick(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    // Re-sync immediately when the app returns to the foreground.
    const onVisible = () => document.visibilityState === "visible" && setNow(new Date());
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);

  return now;
}
