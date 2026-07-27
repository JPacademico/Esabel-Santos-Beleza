import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase, usernameToEmail } from "@/lib/supabase";
import { disablePush } from "@/lib/push";
import { useAuthStore } from "@/stores/authStore";

export function useLogin() {
  return useCallback(async (username: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });
    if (error) throw error;
  }, []);
}

export function useLogout() {
  const qc = useQueryClient();
  const reset = useAuthStore((s) => s.reset);

  return useCallback(async () => {
    // Unregister this device before dropping the session (needs a valid JWT).
    await disablePush();
    await supabase.auth.signOut();
    reset();
    qc.clear();
  }, [qc, reset]);
}

/** Sets the password for a pending employee using their one-time setup token. */
export async function activateAccount(token: string, password: string) {
  const { data, error } = await supabase.functions.invoke("activate-employee", {
    body: { token, password },
  });
  if (error) {
    // Edge Function errors carry the useful message in the response body.
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const body = await ctx.json();
        throw new Error(body?.error ?? error.message);
      } catch (parsed) {
        if (parsed instanceof Error && parsed.message !== error.message) throw parsed;
      }
    }
    throw error;
  }
  return data as { ok: true };
}
