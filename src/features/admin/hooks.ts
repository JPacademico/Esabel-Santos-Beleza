import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { invokeFunction } from "@/lib/invokeFunction";
import { queryKeys } from "@/lib/queryClient";
import type { AccessLinkResult, NewEmployeeInput, Profile } from "@/types/domain";

/** Full roster (including pending/inactive) for the admin page. */
export function useEmployees() {
  return useQuery({
    queryKey: queryKeys.employees,
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
