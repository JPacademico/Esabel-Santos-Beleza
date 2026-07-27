import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryClient";
import type { AccessLinkResult, NewEmployeeInput, Profile } from "@/types/domain";

/** Edge Functions return their message in the response body, not error.message. */
async function invokeFunction<T>(name: string, body: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, {
    body: body as Record<string, unknown>,
  });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const parsed = await ctx.json();
        if (parsed?.error) throw new Error(parsed.error);
      } catch (e) {
        if (e instanceof Error && e.message !== error.message) throw e;
      }
    }
    throw error;
  }
  return data as T;
}

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
