import { addDays } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  formatDayLong,
  formatDayRelative,
  isToday,
  isWithinHorizon,
  startOfDay,
} from "@/lib/dates";

interface Props {
  day: Date;
  onChange: (day: Date) => void;
  onOpenMonth: () => void;
}

export function DayPager({ day, onChange, onOpenMonth }: Props) {
  const next = addDays(day, 1);
  // Past is freely browsable; the future stops at the 2-month horizon.
  const canGoNext = isWithinHorizon(next);
  const showToday = !isToday(day);

  return (
    <div className="mb-4 space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(addDays(day, -1))}
          aria-label="Dia anterior"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-text transition hover:bg-surface-2 active:scale-95"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          onClick={onOpenMonth}
          className="flex min-w-0 flex-1 flex-col items-center rounded-lg border border-border bg-surface px-3 py-1.5 transition hover:bg-surface-2"
        >
          <span className="flex items-center gap-1.5 text-sm font-semibold text-text">
            <CalendarDays className="h-4 w-4 text-accent" />
            {formatDayRelative(day)}
          </span>
          <span className="truncate text-xs capitalize text-muted">{formatDayLong(day)}</span>
        </button>

        <button
          onClick={() => canGoNext && onChange(next)}
          disabled={!canGoNext}
          aria-label="Próximo dia"
          title={canGoNext ? undefined : "Limite de 2 meses à frente"}
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-text transition",
            canGoNext ? "hover:bg-surface-2 active:scale-95" : "cursor-not-allowed opacity-40",
          )}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {showToday && (
        <button
          onClick={() => onChange(startOfDay(new Date()))}
          className="mx-auto flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/15"
        >
          <CalendarCheck className="h-3.5 w-3.5" />
          Voltar para hoje
        </button>
      )}
    </div>
  );
}
