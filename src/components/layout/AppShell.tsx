import { NavLink, Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarDays, LogOut, Scissors, Settings, Users, UsersRound } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuthStore } from "@/stores/authStore";
import { useRealtime } from "@/hooks/useRealtime";
import { useLogout } from "@/features/auth/hooks";
import { cn } from "@/lib/cn";

const NAV = [
  { to: "/", label: "Agenda", icon: CalendarDays, end: true },
  { to: "/clientes", label: "Clientes", icon: Users, end: false },
  { to: "/equipe", label: "Equipe", icon: UsersRound, end: false, adminOnly: true },
  { to: "/ajustes", label: "Ajustes", icon: Settings, end: false },
];

export function AppShell() {
  const profile = useAuthStore((s) => s.profile);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const location = useLocation();
  const logout = useLogout();

  // Keep every open device in sync with appointment/client changes.
  useRealtime(true);

  const items = NAV.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-3 px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-fg">
            <Scissors className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight text-text">
              Esabel Santos Beleza
            </p>
            <p className="truncate text-xs leading-tight text-muted">
              {profile?.full_name}
              {isAdmin && " · Administradora"}
            </p>
          </div>
          <ThemeToggle />
          <button
            onClick={() => void logout()}
            aria-label="Sair"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-danger"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-4">
        {/*
          Page transitions are CSS-only and visibility never depends on them.

          Previously this was <AnimatePresence mode="wait"> around a
          motion.div with `initial={{ opacity: 0 }}`. Two problems:
          1. <Outlet /> swaps in the new page the moment the URL changes, so
             the "exiting" child no longer holds the old page and its exit
             can fail to resolve — with mode="wait" the incoming page then
             never mounts.
          2. Any JS animation that starts at opacity 0 and doesn't finish
             leaves the page permanently invisible (blank tab).

          Keying by pathname remounts the subtree so the CSS animation
          replays per navigation, and the base style stays fully opaque.
        */}
        <div key={location.pathname} className="page-enter">
          <Outlet />
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur-md pb-safe">
        <div
          className="mx-auto grid w-full max-w-3xl px-2 pt-1.5"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "relative flex flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition",
                  isActive ? "text-accent" : "text-muted hover:text-text",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-x-2 inset-y-0 -z-10 rounded-lg bg-accent/10"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <Icon className="h-5 w-5" />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
