import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Configuração ausente: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local",
  );
}

/**
 * Session persistence contract (7 days):
 *  - here:    persistSession keeps the refresh token in localStorage across app launches
 *  - backend: Auth "inactivity timeout" = 604800s expires it after 7 idle days
 */
export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // no email-link flows in this app
    storageKey: "esb.auth",
  },
});

/** Usernames are mapped to synthetic emails; the UI never shows this. */
export const SYNTHETIC_EMAIL_DOMAIN = "salon.internal";

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${SYNTHETIC_EMAIL_DOMAIN}`;
}
