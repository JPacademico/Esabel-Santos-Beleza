import { startOfDay } from "date-fns";

/* --------------------------------------------------------------------------
   Business hours for the master grid.

   The salon works 09:00–18:00, and the paper agenda this replaces was ruled in
   half-hours — so the grid is 19 rows (09:00 … 18:00 inclusive).

   SLOT_MINUTES is also the conflict window: with no duration field on an
   appointment, "already occupied" can only honestly mean "another appointment
   starts inside the same half-hour block", which is exactly what one cell of
   this grid represents.
-------------------------------------------------------------------------- */

export const DAY_START_HOUR = 9;
export const DAY_END_HOUR = 18;
export const SLOT_MINUTES = 30;
export const SLOT_MS = SLOT_MINUTES * 60_000;

/** Minutes past midnight for every row of the grid, in order. */
export const SLOT_MINUTES_OF_DAY: number[] = (() => {
  const slots: number[] = [];
  for (let m = DAY_START_HOUR * 60; m <= DAY_END_HOUR * 60; m += SLOT_MINUTES) {
    slots.push(m);
  }
  return slots;
})();

/** "09:30" — pure string maths, so it never depends on a Date or a locale. */
export function slotLabel(minutesOfDay: number): string {
  const h = Math.floor(minutesOfDay / 60);
  const m = minutesOfDay % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Top of the hour reads stronger than the half — used to weight the row rule. */
export function isHourStart(minutesOfDay: number): boolean {
  return minutesOfDay % 60 === 0;
}

/** The actual Date for a slot on a given day. */
export function slotDate(day: Date, minutesOfDay: number): Date {
  const date = startOfDay(day);
  date.setMinutes(minutesOfDay);
  return date;
}

/**
 * Which slot an appointment falls into, or null if it sits outside business
 * hours.
 *
 * Floors to the containing block rather than requiring an exact match, so an
 * appointment typed as 09:40 still appears in the 09:30 cell instead of
 * silently vanishing from the grid.
 */
export function slotOf(scheduledAt: string, day: Date): number | null {
  const at = new Date(scheduledAt);
  const dayStart = startOfDay(day).getTime();
  const minutes = Math.floor((at.getTime() - dayStart) / 60_000);
  if (Number.isNaN(minutes)) return null;

  const floored = Math.floor(minutes / SLOT_MINUTES) * SLOT_MINUTES;
  const first = SLOT_MINUTES_OF_DAY[0];
  const last = SLOT_MINUTES_OF_DAY[SLOT_MINUTES_OF_DAY.length - 1];
  if (floored < first || floored > last) return null;
  return floored;
}

/** Composite key for the cell lookup — `${employeeId}@${minutesOfDay}`. */
export function cellKey(employeeId: string, minutesOfDay: number): string {
  return `${employeeId}@${minutesOfDay}`;
}

/** Half-open window [start, end) used for conflict detection. */
export function slotWindowISO(at: Date): { start: string; end: string } {
  const start = Math.floor(at.getTime() / SLOT_MS) * SLOT_MS;
  return {
    start: new Date(start).toISOString(),
    end: new Date(start + SLOT_MS).toISOString(),
  };
}
