import type { AppointmentStatus } from "@/types/domain";

/**
 * The status shown in the UI. Note "concluded" is NOT a database value — the
 * DB only ever stores 'scheduled' | 'canceled'. Concluded is derived at render
 * time, which is why no CRON job is needed to sweep past appointments.
 */
export type DisplayStatus = "scheduled" | "concluded" | "canceled";

/** Pure and render-only. Never written back to the database. */
export function computeAppointmentStatus(
  appointment: { status: AppointmentStatus; scheduled_at: string },
  now: Date = new Date(),
): DisplayStatus {
  if (appointment.status === "canceled") return "canceled";
  return new Date(appointment.scheduled_at).getTime() < now.getTime() ? "concluded" : "scheduled";
}

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  scheduled: "Agendado",
  concluded: "Concluído",
  canceled: "Cancelado",
};

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
