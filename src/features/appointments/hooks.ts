import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryClient";
import { dayRangeISO, monthRangeISO, toDateParam, toMonthParam } from "@/lib/dates";
import { currentUserId } from "@/stores/authStore";
import type { AppointmentInput, AppointmentWithEmployee, Profile } from "@/types/domain";

/**
 * Two FKs point at profiles (employee_id and created_by), so the join must name
 * the constraint explicitly.
 */
const SELECT_WITH_EMPLOYEE =
  "*, employee:profiles!appointments_employee_id_fkey(id, full_name)";

/** All appointments for one day — every user sees everyone's (global awareness). */
export function useAppointmentsByDay(day: Date) {
  const key = toDateParam(day);
  return useQuery({
    queryKey: queryKeys.appointmentsByDay(key),
    queryFn: async (): Promise<AppointmentWithEmployee[]> => {
      const { start, end } = dayRangeISO(day);
      const { data, error } = await supabase
        .from("appointments")
        .select(SELECT_WITH_EMPLOYEE)
        .gte("scheduled_at", start)
        .lte("scheduled_at", end)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as AppointmentWithEmployee[];
    },
  });
}

/** Month view: lighter payload, used to render per-day counts. */
export function useAppointmentsByMonth(month: Date) {
  const key = toMonthParam(month);
  return useQuery({
    queryKey: queryKeys.appointmentsByMonth(key),
    queryFn: async () => {
      const { start, end } = monthRangeISO(month);
      const { data, error } = await supabase
        .from("appointments")
        .select("id, scheduled_at, status")
        .gte("scheduled_at", start)
        .lte("scheduled_at", end)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Assignable staff for the admin's "Profissional" selector.
 *
 * Includes `pending` accounts on purpose: an employee who has been invited but
 * hasn't set her password yet still works at the salon and must be bookable —
 * the owner is replacing a paper agenda, not gating on logins. Only `inactive`
 * (deactivated) accounts are excluded.
 */
export function useEmployeeOptions(enabled = true) {
  return useQuery({
    enabled,
    queryKey: queryKeys.employeeOptions,
    queryFn: async (): Promise<Pick<Profile, "id" | "full_name" | "role" | "status">[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role, status")
        .neq("status", "inactive")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * id → full name for every professional, including deactivated ones.
 *
 * Split appointments name a professional per service, and only the lead is
 * joined on the appointment row — PostgREST can't join through a uuid[] column.
 * Rather than N joins, the roster is fetched once and shared: it is small
 * (single-digit staff) and changes rarely, hence the long staleTime.
 */
export function useEmployeeNames() {
  return useQuery({
    queryKey: queryKeys.employeeNames,
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<Map<string, string>> => {
      const { data, error } = await supabase.from("profiles").select("id, full_name");
      if (error) throw error;
      return new Map((data ?? []).map((p) => [p.id, p.full_name]));
    },
  });
}

function invalidateAppointments(qc: ReturnType<typeof useQueryClient>) {
  return qc.invalidateQueries({ queryKey: queryKeys.appointments });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AppointmentInput) => {
      const { data, error } = await supabase
        .from("appointments")
        .insert({ ...input, created_by: currentUserId() })
        .select(SELECT_WITH_EMPLOYEE)
        .single();
      if (error) throw error;
      return data as unknown as AppointmentWithEmployee;
    },
    onSuccess: () => invalidateAppointments(qc),
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<AppointmentInput> }) => {
      const { data, error } = await supabase
        .from("appointments")
        .update(input)
        .eq("id", id)
        .select(SELECT_WITH_EMPLOYEE)
        .single();
      if (error) throw error;
      return data as unknown as AppointmentWithEmployee;
    },
    onSuccess: () => invalidateAppointments(qc),
  });
}

/** Cancellation always carries a reason (mirrors the DB check constraint). */
export function useCancelAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data, error } = await supabase
        .from("appointments")
        .update({
          status: "canceled",
          cancellation_reason: reason,
          canceled_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select(SELECT_WITH_EMPLOYEE)
        .single();
      if (error) throw error;
      return data as unknown as AppointmentWithEmployee;
    },
    onSuccess: () => invalidateAppointments(qc),
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAppointments(qc),
  });
}
