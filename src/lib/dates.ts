import {
  addMonths,
  endOfDay,
  endOfMonth,
  format,
  isSameDay,
  isToday,
  isTomorrow,
  isYesterday,
  parse,
  parseISO,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export const DATE_PARAM = "yyyy-MM-dd";
export const MONTH_PARAM = "yyyy-MM";

/* --------------------------------------------------------------------------
   The 2-month booking horizon. Mirrored server-side by the
   enforce_appointment_window() trigger — this is UX, that is enforcement.
-------------------------------------------------------------------------- */

/** Last day (inclusive) that may be booked or navigated to. */
export function maxAheadDate(from: Date = new Date()): Date {
  return endOfDay(addMonths(startOfDay(from), 2));
}

export function canScheduleAt(date: Date): boolean {
  return date.getTime() <= maxAheadDate().getTime();
}

/** True when the day is within the bookable horizon (past days are allowed). */
export function isWithinHorizon(day: Date): boolean {
  return startOfDay(day).getTime() <= startOfDay(maxAheadDate()).getTime();
}

/* -------------------------------------------------------------------------- */

export function toDateParam(date: Date): string {
  return format(date, DATE_PARAM);
}

export function toMonthParam(date: Date): string {
  return format(date, MONTH_PARAM);
}

/** Parses `yyyy-MM-dd` in LOCAL time (parseISO would treat it as UTC midnight). */
export function fromDateParam(value?: string): Date {
  if (!value) return startOfDay(new Date());
  const parsed = parse(value, DATE_PARAM, new Date());
  return Number.isNaN(parsed.getTime()) ? startOfDay(new Date()) : startOfDay(parsed);
}

export function fromMonthParam(value?: string): Date {
  if (!value) return startOfMonth(new Date());
  const parsed = parse(value, MONTH_PARAM, new Date());
  return Number.isNaN(parsed.getTime()) ? startOfMonth(new Date()) : startOfMonth(parsed);
}

export function dayRangeISO(day: Date): { start: string; end: string } {
  return { start: startOfDay(day).toISOString(), end: endOfDay(day).toISOString() };
}

export function monthRangeISO(month: Date): { start: string; end: string } {
  return {
    start: startOfDay(startOfMonth(month)).toISOString(),
    end: endOfDay(endOfMonth(month)).toISOString(),
  };
}

/* ------------------------------ formatting ------------------------------- */

export function formatTime(iso: string): string {
  return format(parseISO(iso), "HH:mm");
}

export function formatDayLong(date: Date): string {
  return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
}

export function formatMonthLong(date: Date): string {
  return format(date, "MMMM 'de' yyyy", { locale: ptBR });
}

/** "Hoje" / "Amanhã" / "Ontem", else a short weekday+date. */
export function formatDayRelative(date: Date): string {
  if (isToday(date)) return "Hoje";
  if (isTomorrow(date)) return "Amanhã";
  if (isYesterday(date)) return "Ontem";
  return format(date, "EEE, d MMM", { locale: ptBR });
}

/** Full human date+time used in the WhatsApp cancellation notice. */
export function formatFullPtBR(iso: string): string {
  return format(parseISO(iso), "d 'de' MMMM 'às' HH:mm", { locale: ptBR });
}

/* -------------------- <input type="datetime-local"> glue ------------------ */

export function toDatetimeLocalValue(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

export function fromDatetimeLocalValue(value: string): Date {
  return parse(value, "yyyy-MM-dd'T'HH:mm", new Date());
}

export { addMonths, isSameDay, isToday, startOfDay, startOfMonth, endOfMonth, parseISO };
