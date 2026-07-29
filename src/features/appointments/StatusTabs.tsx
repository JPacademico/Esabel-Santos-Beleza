import { CalendarCheck, CalendarClock, CalendarX2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { DisplayStatus } from "@/lib/status";

export const STATUS_ORDER: DisplayStatus[] = ["scheduled", "concluded", "canceled"];

/** Plural tab wording — distinct from STATUS_LABEL, which labels one card. */
export const STATUS_TAB_LABEL: Record<DisplayStatus, string> = {
  scheduled: "Agendados",
  concluded: "Concluídos",
  canceled: "Cancelados",
};

const TABS: Record<DisplayStatus, { icon: typeof CalendarClock; active: string }> = {
  scheduled: {
    icon: CalendarClock,
    active: "border-accent/40 bg-accent/12 text-accent",
  },
  concluded: {
    icon: CalendarCheck,
    active: "border-success/40 bg-success/12 text-success",
  },
  canceled: {
    icon: CalendarX2,
    active: "border-danger/40 bg-danger/12 text-danger",
  },
};

interface Props {
  value: DisplayStatus;
  onChange: (status: DisplayStatus) => void;
  counts: Record<DisplayStatus, number>;
}

/**
 * Splits the day into three lists instead of one mixed feed.
 *
 * The counts are always visible, deliberately: with "Agendados" as the default
 * view, a past day would otherwise look empty even though it holds a full day
 * of concluded work. Seeing "Concluídos · 6" makes it obvious where it went.
 */
export function StatusTabs({ value, onChange, counts }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Filtrar por situação"
      className="mb-3 grid grid-cols-3 gap-1.5"
    >
      {STATUS_ORDER.map((status) => {
        const tab = TABS[status];
        const Icon = tab.icon;
        const selected = value === status;
        return (
          <button
            key={status}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(status)}
            className={cn(
              "flex min-w-0 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition",
              selected
                ? tab.active
                : "border-border text-muted hover:border-accent/30 hover:text-text",
              // Nothing to show is still worth showing — but dim it so the eye
              // goes to the lists that actually have something in them.
              !selected && counts[status] === 0 && "opacity-55",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{STATUS_TAB_LABEL[status]}</span>
            <span
              className={cn(
                // Solid palette colours, not `bg-current/15`: Tailwind can't
                // apply an opacity modifier to currentColor.
                "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                selected ? "bg-surface" : "bg-surface-2",
              )}
            >
              {counts[status]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
