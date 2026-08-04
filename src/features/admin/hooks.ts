import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { invokeFunction } from "@/lib/invokeFunction";
import { queryKeys } from "@/lib/queryClient";
import type { AccessLinkResult, NewEmployeeInput, Profile } from "@/types/domain";

/** Full roster (including pending/inactive) for the admin page. */
export function useEmployees() {
  return useQuery({
    queryKey: queryKeys.employeeRoster,
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("role")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewEmployeeInput) =>
      invokeFunction<AccessLinkResult>("create-employee", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.employees }),
  });
}

/**
 * Re-issues an access link for an existing employee — covers both "forgot my
 * password" and "never activated". Invalidates any previous link server-side.
 */
export function useResetEmployeeAccess() {
  return useMutation({
    mutationFn: (user_id: string) =>
      invokeFunction<AccessLinkResult>("reset-employee-password", { user_id }),
  });
}

/**
 * Undoes a soft deactivation: unbans the account and restores `status`. If she
 * hadn't finished onboarding before being deactivated, this alone won't give
 * her a working password — the "Reenviar acesso" action reappears once status
 * stops being `inactive`, which is the follow-up for that case.
 */
export function useReactivateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (user_id: string) => invokeFunction<{ ok: true }>("reactivate-employee", { user_id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.employees }),
  });
}

export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { user_id: string; reassign_to?: string; hard?: boolean }) =>
      invokeFunction<{ ok: true; mode: "soft" | "hard" }>("delete-employee", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.employees });
      qc.invalidateQueries({ queryKey: queryKeys.appointments });
    },
  });
}
