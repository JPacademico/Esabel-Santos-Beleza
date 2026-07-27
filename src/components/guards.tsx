import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Scissors } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

export function SplashScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg">
      <div className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-accent text-accent-fg">
        <Scissors className="h-7 w-7" />
      </div>
      <p className="text-sm text-muted">Carregando…</p>
    </div>
  );
}

/** Requires an authenticated session. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const session = useAuthStore((s) => s.session);
  const ready = useAuthStore((s) => s.ready);
  const location = useLocation();

  if (!ready) return <SplashScreen />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

/**
 * Requires super_admin. This is UX only — the real enforcement is the RLS
 * policies and the Edge Functions' assertSuperAdmin() check.
 */
export function AdminRoute({ children }: { children: ReactNode }) {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const ready = useAuthStore((s) => s.ready);

  if (!ready) return <SplashScreen />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}
