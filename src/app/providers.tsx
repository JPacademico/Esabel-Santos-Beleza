import { useEffect, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import type { Session } from "@supabase/supabase-js";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { useInstallPromptListener } from "@/hooks/useInstallPrompt";

/**
 * Hydrates the auth store from the persisted session and keeps it in sync.
 * The profile carries the role, which drives admin-only UI.
 */
function AuthProvider({ children }: { children: ReactNode }) {
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    let active = true;

    async function hydrate(session: Session | null) {
      if (!session) {
        if (active) setAuth({ session: null, profile: null, isAdmin: false, ready: true });
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (!active) return;

      if (error || !profile) {
        // Session without a usable profile (e.g. deactivated) — force a clean state.
        setAuth({ session, profile: null, isAdmin: false, ready: true });
        return;
      }

      setAuth({
        session,
        profile,
        isAdmin: profile.role === "super_admin",
        ready: true,
      });
    }

    void supabase.auth.getSession().then(({ data }) => hydrate(data.session));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      void hydrate(session);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [setAuth]);

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  const theme = useUIStore((s) => s.theme);
  useInstallPromptListener();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <Toaster
          position="top-center"
          theme={theme}
          richColors
          closeButton
          duration={3500}
          toastOptions={{
            style: {
              borderRadius: "var(--radius)",
              fontFamily: "inherit",
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
