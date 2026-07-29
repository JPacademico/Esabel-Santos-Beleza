/** Separator between services in the joined display string (matches the DB trigger). */
export const SERVICE_SEPARATOR = " + ";

/** Splits a joined display string back into individual services. */
export function splitServices(joined: string | null | undefined): string[] {
  return (joined ?? "")
    .split("+")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * The services on an appointment, as a list.
 *
 * Falls back to splitting `service_name` for rows written before the `services`
 * column existed — the backfill covers stored rows, but a cached Query payload
 * from a still-open tab can predate it.
 */
export function appointmentServices(appointment: {
  services?: string[] | null;
  service_name?: string | null;
}): string[] {
  if (appointment.services?.length) return appointment.services;
  return splitServices(appointment.service_name);
}

/** Human-readable joined form, e.g. "Manicure + Pedicure". */
export function formatServices(appointment: {
  services?: string[] | null;
  service_name?: string | null;
}): string {
  return appointmentServices(appointment).join(SERVICE_SEPARATOR);
}

/* ----------------------------- staff assignment ---------------------------- */

interface AssignmentSource {
  services?: string[] | null;
  service_name?: string | null;
  service_employee_ids?: string[] | null;
  employee_id?: string | null;
}

/**
 * Who performs each service, aligned 1:1 with `appointmentServices()`.
 *
 * Falls back to the lead `employee_id` for every service, which covers rows
 * written before per-service assignment existed *and* any payload where the two
 * arrays drifted — the UI must never render a service with no professional.
 */
export function serviceAssignments(appointment: AssignmentSource): string[] {
  const services = appointmentServices(appointment);
  const ids = appointment.service_employee_ids ?? [];
  const lead = appointment.employee_id ?? "";
  return services.map((_, i) => ids[i] ?? lead);
}

/** Distinct professionals involved, in the order their first service appears. */
export function distinctStaff(appointment: AssignmentSource): string[] {
  return [...new Set(serviceAssignments(appointment).filter(Boolean))];
}

/** True when the appointment is split across more than one professional. */
export function isSplitAcrossStaff(appointment: AssignmentSource): boolean {
  return distinctStaff(appointment).length > 1;
}

/**
 * Re-aligns the assignment array after the service list changes.
 *
 * Assignments follow their service by name rather than by index, so removing
 * "Manicure" from the middle doesn't shift everyone after it onto the wrong
 * professional. Newly added services take `fallback`.
 */
export function alignAssignments(
  prevServices: string[],
  prevStaff: string[],
  nextServices: string[],
  fallback: string,
): string[] {
  const byName = new Map<string, string>();
  prevServices.forEach((service, i) => {
    const assignee = prevStaff[i];
    if (assignee) byName.set(service.toLowerCase(), assignee);
  });
  return nextServices.map((service) => byName.get(service.toLowerCase()) ?? fallback);
}
