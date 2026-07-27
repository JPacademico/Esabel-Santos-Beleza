import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  eachDayOfInterval,
  endOfWeek,
  isSameMonth,
  startOfWeek,
  addMonths as addMonthsFn,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  endOfMonth,
  formatMonthLong,
  isSameDay,
  isToday,
  isWithinHorizon,
  startOfMonth,
  toDateParam,
} from "@/lib/dates";
import { useAppointmentsByMonth } from "./hooks";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

interface Props {
  month: Date;
  selected: Date;
  onMonthChange: (month: Date) => void;
  onSelectDay: (day: Date) => void;
}

export function MonthGrid({ month, selected, onMonthChange, onSelectDay }: Props) {
  const { data: appointments } = useAppointmentsByMonth(month);

  // Count active (non-canceled) appointments per day for the density dots.
  const countsByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const appointment of appointments ?? []) {
      if (appointment.status === "canceled") continue;
      const key = toDateParam(new Date(appointment.scheduled_at));
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [appointments]);

  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [month]);

  const nextMonth = addMonthsFn(month, 1);
  const canGoNext = isWithinHorizon(startOfMonth(nextMonth));

  return (
    <div className="card mb-4 p-3">
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => onMonthChange(addMonthsFn(month, -1))}
          aria-label="Mês anterior"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-text transition hover:bg-surface-2"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold capitalize text-text">
          {formatMonthLong(month)}
        </span>
        <button
          onClick={() => canGoNext && onMonthChange(nextMonth)}
          disabled={!canGoNext}
          aria-label="Próximo mês"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg text-text transition",
            canGoNext ? "hover:bg-surface-2" : "cursor-not-allowed opacity-40",
          )}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((label, index) => (
          <span key={index} className="py-1 text-center text-[11px] font-medium text-muted">
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const inMonth = isSameMonth(day, month);
          const bookable = isWithinHorizon(day);
          const isSelected = isSameDay(day, selected);
          const today = isToday(day);
          const count = countsByDay.get(toDateParam(day)) ?? 0;

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDay(day)}
              disabled={!bookable}
              title={bookable ? undefined : "Além do limite de 2 meses"}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition",
                !inMonth && "opacity-35",
                !bookable && "cursor-not-allowed opacity-25",
                bookable && !isSelected && "hover:bg-surface-2",
                isSelected && "bg-accent text-accent-fg font-semibold",
                !isSelected && today && "ring-1 ring-inset ring-accent/50 font-semibold text-accent",
                !isSelected && !today && "text-text",
              )}
            >
              {isSelected && (
                <motion.span
                  layoutId="month-selected"
                  className="absolute inset-0 -z-10 rounded-lg bg-accent"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              {day.getDate()}
              {count > 0 && (
                <span
                  className={cn(
                    "absolute bottom-1 h-1 w-1 rounded-full",
                    isSelected ? "bg-accent-fg" : "bg-accent",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-center text-[11px] text-muted">
        Agendamentos liberados até 2 meses à frente.
      </p>
    </div>
  );
}
