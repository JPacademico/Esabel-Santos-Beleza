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

/** Payload accepted by the create/edit form. */
export interface AppointmentInput {
  client_id: string | null;
  client_name: string;
  client_phone: string | null;
  employee_id: string;
  service_name: string;
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

export interface CreateEmployeeResult {
  user_id: string;
  setup_url: string;
  wa_link: string;
}
