import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import type { Profile } from "@/types/domain";

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  /** False until the initial getSession() resolves — gates the first render. */
  ready: boolean;
  setAuth: (patch: Partial<Omit<AuthState, "setAuth" | "reset">>) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  isAdmin: false,
  ready: false,
  setAuth: (patch) => set(patch),
  reset: () => set({ session: null, profile: null, isAdmin: false, ready: true }),
}));

/** Convenience selector for the current user id (used by mutations). */
export function currentUserId(): string | null {
  return useAuthStore.getState().session?.user.id ?? null;
}
