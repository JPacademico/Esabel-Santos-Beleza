import type { AppointmentStatus } from "@/types/domain";

/**
 * The status shown in the UI.
 *
 * All three are now STORED. "Concluded" used to be derived at render time
 * (past AND not canceled), which quietly equated "the time passed" with "it
 * happened" — a no-show, or a client who cancels after the booked hour, was
 * indistinguishable from a client who was served. Completion is now an
 * explicit action, exactly like cancellation.
 */
export type DisplayStatus = AppointmentStatus;

/**
 * Kept as a function rather than reading `.status` inline at every call site:
 * this is the seam where the computed rule used to live, and having one place
 * that answers "what status is this?" is what made removing that rule a
 * contained change.
 */
export function computeAppointmentStatus(appointment: {
  status: AppointmentStatus;
}): DisplayStatus {
  return appointment.status;
}

/**
 * Still `scheduled`, but the booked time has passed — nobody has said whether
 * it happened.
 *
 * This is the state the explicit-completion change creates, and the reason the
 * agenda keeps a clock tick: it is a prompt for action ("did this happen?"),
 * not a status of its own, so it never gets its own list. It stays under
 * "Agendados" where it still needs attention.
 */
export function isAwaitingCompletion(
  appointment: { status: AppointmentStatus; scheduled_at: string },
  now: Date = new Date(),
): boolean {
  if (appointment.status !== "scheduled") return false;
  return new Date(appointment.scheduled_at).getTime() < now.getTime();
}

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  scheduled: "Agendado",
  concluded: "Concluído",
  canceled: "Cancelado",
};

/** Shown instead of "Agendado" once the booked time has passed. */
export const AWAITING_LABEL = "Confirmar";

/** Tailwind classes per status, used by Badge and AppointmentCard. */
export const STATUS_STYLES: Record<DisplayStatus, { badge: string; dot: string }> = {
  scheduled: {
    badge: "bg-accent/12 text-accent border-accent/25",
    dot: "bg-accent",
  },
  concluded: {
    badge: "bg-success/12 text-success border-success/25",
    dot: "bg-success",
  },
  canceled: {
    badge: "bg-danger/12 text-danger border-danger/25",
    dot: "bg-danger",
  },
};

export const AWAITING_STYLE = {
  badge: "bg-warning/12 text-warning border-warning/25",
  dot: "bg-warning",
};
