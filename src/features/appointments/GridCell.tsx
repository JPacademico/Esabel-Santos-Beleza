import { memo } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { appointmentServices } from "@/lib/services";
import type { AppointmentWithEmployee } from "@/types/domain";

/**
 * Shared empty array for unoccupied cells.
 *
 * The cell lookup is rebuilt whenever the day's appointments change, which
 * creates a fresh array for every occupied cell. Handing every EMPTY cell this
 * one frozen instance keeps their props referentially identical across that
 * rebuild, so `memo` holds and only the cells that actually changed re-render.
 * In a mostly-empty 19×8 grid that is the overwhelming majority of them.
 */
export const NO_APPOINTMENTS: readonly AppointmentWithEmployee[] = Object.freeze([]);

interface Props {
  appointments: readonly AppointmentWithEmployee[];
  employeeId: string;
  minutesOfDay: number;
  /**
   * Whether an empty cell renders as a clickable "+" at all — true for both
   * roles whenever the day is within the booking horizon.
   *
   * This does NOT mean the click will succeed: an employee tapping another
   * professional's column still gets a "not authorized" toast. That check
   * happens in the parent's `onBook`, deliberately not here, so every empty
   * cell looks and behaves identically and the restriction is taught by the
   * toast rather than by an inconsistent grid.
   *
   * Also not the same thing as `canOpen`: the owner may still open an existing
   * appointment on a day that is itself past the booking horizon.
   */
  canBook: boolean;
  /**
   * Whether the appointment(s) in THIS column may be opened for editing.
   *
   * The owner may always open any column. An employee may open only their own
   * — which, by construction, covers every appointment actually shown here: an
   * appointment is bucketed into a column only for professionals assigned to
   * it (see MasterGridPage), so "this is my column" and "I'm assigned to
   * whatever's in it" are the same fact. No per-appointment check is needed at
   * this layer; the parent's `handleOpen` still re-checks it directly as a
   * defense-in-depth safety net, the same way it re-checks booking.
   */
  canOpen: boolean;
  onBook: (employeeId: string, minutesOfDay: number) => void;
  onOpen: (appointment: AppointmentWithEmployee) => void;
  /**
   * Whether this row's half-hour has already elapsed.
   *
   * A boolean per ROW rather than a `now: Date` per cell, and that distinction
   * matters: a Date prop changes identity on every minute tick and would
   * re-render all ~150 cells once a minute. This flips at most once per slot.
   */
  slotPast: boolean;
}

function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function GridCellBase({
  appointments,
  employeeId,
  minutesOfDay,
  canBook,
  canOpen,
  onBook,
  onOpen,
  slotPast,
}: Props) {
  if (appointments.length === 0) {
    // A read-only viewer gets a plain div: rendering a disabled <button> here
    // would put 150+ focusable no-ops in the tab order.
    if (!canBook) {
      return <div className="h-full min-h-[3.25rem] border-b border-r border-border/60" />;
    }
    return (
      <button
        type="button"
        onClick={() => onBook(employeeId, minutesOfDay)}
        aria-label="Agendar neste horário"
        className={cn(
          "group flex h-full min-h-[3.25rem] items-center justify-center",
          "border-b border-r border-border/60 transition-colors",
          "hover:bg-accent/8 focus-visible:bg-accent/10 focus-visible:outline-none",
        )}
      >
        <Plus className="h-3.5 w-3.5 text-transparent transition-colors group-hover:text-accent/70 group-focus-visible:text-accent" />
      </button>
    );
  }

  return (
    <div className="flex h-full min-h-[3.25rem] min-w-0 flex-col gap-0.5 border-b border-r border-border/60 p-1">
      {appointments.map((appointment) => {
        const concluded = appointment.status === "concluded";
        // Same rule as isAwaitingCompletion, expressed against the row's slot so
        // no clock is read here — see the note on `slotPast`.
        const awaiting = appointment.status === "scheduled" && slotPast;
        const services = appointmentServices(appointment);
        // A viewer who can't act on this column gets a div, not a disabled
        // button: a screenful of dead controls in the tab order is worse than
        // none, and this is the common case for an employee looking at a
        // teammate's column.
        const Tag = canOpen ? "button" : "div";
        return (
          <Tag
            key={appointment.id}
            {...(canOpen
              ? { type: "button" as const, onClick: () => onOpen(appointment) }
              : {})}
            title={`${appointment.client_name} — ${services.join(" + ")}`}
            className={cn(
              "min-w-0 flex-1 rounded-md px-1.5 py-1 text-left transition",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
              concluded
                ? cn("bg-success/12", canOpen && "hover:bg-success/20")
                : awaiting
                  ? cn("bg-warning/12", canOpen && "hover:bg-warning/20")
                  : cn("bg-accent/12", canOpen && "hover:bg-accent/20"),
            )}
          >
            <span
              className={cn(
                "block truncate text-[11px] font-semibold leading-tight",
                concluded ? "text-success" : awaiting ? "text-warning" : "text-accent",
              )}
            >
              {firstNameOf(appointment.client_name)}
            </span>
            <span className="block truncate text-[10px] leading-tight text-muted">
              {services.join(" + ")}
            </span>
          </Tag>
        );
      })}
    </div>
  );
}

export const GridCell = memo(GridCellBase);
