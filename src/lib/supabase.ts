import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Vite inlines VITE_* at BUILD time. If the host (Vercel) builds without them,
 * they compile to `undefined`. We must NOT throw here — a throw during module
 * init stops React from mounting and the user just sees a blank page. Instead
 * we record what's missing and let main.tsx render a readable error screen.
 */
export const missingConfig: string[] = [];
if (!url) missingConfig.push("VITE_SUPABASE_URL");
if (!anonKey) missingConfig.push("VITE_SUPABASE_ANON_KEY");

/**
 * Session persistence contract (7 days):
 *  - here:    persistSession keeps the refresh token in localStorage across app launches
 *  - backend: Auth "inactivity timeout" = 604800s expires it after 7 idle days
 */
export const supabase = createClient<Database>(
  url || "https://placeholder.invalid",
  anonKey || "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // no email-link flows in this app
      storageKey: "esb.auth",
    },
  },
);

/** Usernames are mapped to synthetic emails; the UI never shows this. */
export const SYNTHETIC_EMAIL_DOMAIN = "salon.internal";

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${SYNTHETIC_EMAIL_DOMAIN}`;
}
