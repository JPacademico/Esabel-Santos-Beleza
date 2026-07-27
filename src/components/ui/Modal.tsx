import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Blocks backdrop/Escape dismissal — used by the mandatory cancel flow. */
  dismissible?: boolean;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  dismissible = true,
  className,
}: ModalProps) {
  // Lock body scroll and wire Escape while open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, dismissible, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => dismissible && onClose()}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              "relative flex max-h-[92dvh] w-full flex-col overflow-hidden bg-surface shadow-float",
              "rounded-t-2xl sm:max-w-lg sm:rounded-2xl",
              className,
            )}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            <header className="flex items-start gap-3 border-b border-border px-5 py-4">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-semibold text-text">{title}</h2>
                {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
              </div>
              {dismissible && (
                <button
                  onClick={onClose}
                  aria-label="Fechar"
                  className="-mr-1 -mt-1 rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-text"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

            {footer && (
              <footer className="border-t border-border bg-surface px-5 py-3 pb-safe">{footer}</footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
