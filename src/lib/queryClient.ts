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

  employees: ["employees"] as const,
};
