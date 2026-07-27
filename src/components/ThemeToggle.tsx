import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";

export function ThemeToggle() {
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
      className="relative flex h-10 w-10 items-center justify-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-text"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.18 }}
          className="absolute"
        >
          {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
