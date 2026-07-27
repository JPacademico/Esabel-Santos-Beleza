import { create } from "zustand";

export type Theme = "light" | "dark";

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

  installPrompt: null,
  setInstallPrompt: (installPrompt) => set({ installPrompt }),
}));
