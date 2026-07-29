import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
    mutations: { retry: 0 },
  },
});

export const queryKeys = {
  appointments: ["appointments"] as const,
  appointmentsByDay: (isoDay: string) => ["appointments", "day", isoDay] as const,
  appointmentsByMonth: (ym: string) => ["appointments", "month", ym] as const,

  clients: ["clients"] as const,
  clientList: (search: string) => ["clients", "list", search] as const,
  clientSearch: (term: string) => ["clients", "search", term] as const,

  /**
   * Prefix only — never use as a query key. Invalidating it covers both
   * employee queries below.
   *
   * These MUST stay distinct: they fetch different rows and different columns.
   * Sharing one key made whichever loaded first win the cache, so the Equipe
   * page rendered the picker's active-only, 4-column payload (no phone, no
   * pending staff) and the picker could offer deactivated employees.
   */
  employees: ["employees"] as const,
  /** Admin roster: every profile, all columns, any status. */
  employeeRoster: ["employees", "roster"] as const,
  /** Assignable staff for pickers: excludes deactivated accounts. */
  employeeOptions: ["employees", "options"] as const,
  /**
   * id → name lookup for rendering split appointments. Available to every
   * role (unlike the two above) and includes deactivated staff, because a past
   * appointment may still reference someone who has since left.
   */
  employeeNames: ["employees", "names"] as const,
};
