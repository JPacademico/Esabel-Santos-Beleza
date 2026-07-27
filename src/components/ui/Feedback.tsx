import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { STATUS_LABEL, STATUS_STYLES, type DisplayStatus } from "@/lib/status";

/* ---------------------------------- Badge ---------------------------------- */

export function StatusBadge({ status }: { status: DisplayStatus }) {
  const styles = STATUS_STYLES[status];
  return (
    <motion.span
      layout
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1",
        "text-xs font-medium",
        styles.badge,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", styles.dot)} />
      {STATUS_LABEL[status]}
    </motion.span>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "accent";
}) {
  const tones = {
    neutral: "bg-surface-2 text-muted border-border",
    success: "bg-success/12 text-success border-success/25",
    warning: "bg-warning/12 text-warning border-warning/25",
    danger: "bg-danger/12 text-danger border-danger/25",
    accent: "bg-accent/12 text-accent border-accent/25",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------- Skeleton --------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-surface-2", className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-black/[0.04] to-transparent dark:via-white/[0.06]" />
    </div>
  );
}

export function AppointmentSkeleton() {
  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

/* ------------------------------- Empty state ------------------------------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center px-6 py-14 text-center"
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-2 text-accent">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-text">{title}</h3>
      {description && <p className="mt-1 max-w-xs text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
