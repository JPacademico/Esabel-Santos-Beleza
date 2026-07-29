import { create } from "zustand";
import type { DisplayStatus } from "@/lib/status";

export type Theme = "light" | "dark";

/** Whose appointments the agenda lists. */
export type AgendaScope = "all" | "mine";

const THEME_KEY = "esb.theme";

function readInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  localStorage.setItem(THEME_KEY, theme);
}

interface UIState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

  /**
   * Agenda filters live here rather than in AgendaPage's own state because the
   * app shell keys the page subtree on the pathname, so paging to another day
   * remounts the page. Local state would snap back to "Agendados" on every
   * day change — exactly when reviewing a run of past days needs it to stick.
   *
   * Deliberately NOT persisted to localStorage: it should survive navigation
   * within a session, not silently hide today's work on the next app launch.
   */
  agendaStatus: DisplayStatus;
  setAgendaStatus: (status: DisplayStatus) => void;
  agendaScope: AgendaScope;
  setAgendaScope: (scope: AgendaScope) => void;

  /** Chromium install prompt, stashed until the user taps "Instalar". */
  installPrompt: BeforeInstallPromptEvent | null;
  setInstallPrompt: (event: BeforeInstallPromptEvent | null) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  theme: readInitialTheme(),
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),

  agendaStatus: "scheduled",
  setAgendaStatus: (agendaStatus) => set({ agendaStatus }),
  agendaScope: "all",
  setAgendaScope: (agendaScope) => set({ agendaScope }),

  installPrompt: null,
  setInstallPrompt: (installPrompt) => set({ installPrompt }),
}));
