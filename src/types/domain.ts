import type { Database } from "./database.types";

type Tables = Database["public"]["Tables"];

export type Profile = Tables["profiles"]["Row"];
export type Client = Tables["clients"]["Row"];
export type Appointment = Tables["appointments"]["Row"];
export type PushSubscriptionRow = Tables["push_subscriptions"]["Row"];

export type UserRole = Database["public"]["Enums"]["user_role"];
export type AccountStatus = Database["public"]["Enums"]["account_status"];
export type AppointmentStatus = Database["public"]["Enums"]["appointment_status"];

/** Appointment joined with the assigned employee (as selected in useAppointments). */
export type AppointmentWithEmployee = Appointment & {
  employee: Pick<Profile, "id" | "full_name"> | null;
};

/**
 * Payload accepted by the create/edit form.
 *
 * `services` is the source of truth — a client may book several at once. The
 * joined `service_name` is written by a DB trigger, so it is deliberately NOT
 * part of this payload: sending both invites the two to disagree.
 */
export interface AppointmentInput {
  client_id: string | null;
  client_name: string;
  /** null when no usable number was given — disables the WhatsApp actions. */
  client_phone: string | null;
  /** The lead professional. Must equal service_employee_ids[0]. */
  employee_id: string;
  services: string[];
  /** Positionally parallel to `services`: who performs services[i]. */
  service_employee_ids: string[];
  scheduled_at: string;
}

export interface ClientInput {
  full_name: string;
  phone: string | null;
  birthday: string | null;
}

export interface NewEmployeeInput {
  full_name: string;
  username: string;
  phone: string;
}

/**
 * Returned by both create-employee and reset-employee-password.
 * wa_link is null when the profile has no phone number on file.
 */
export interface AccessLinkResult {
  user_id: string;
  setup_url: string;
  wa_link: string | null;
}
