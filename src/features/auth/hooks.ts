import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase, usernameToEmail } from "@/lib/supabase";
import { invokeFunction } from "@/lib/invokeFunction";
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
  return invokeFunction<{ ok: true }>("activate-employee", { token, password });
}
