import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { AdminRoute, ProtectedRoute } from "@/components/guards";
import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/features/auth/LoginPage";
import { ActivatePage } from "@/features/auth/ActivatePage";
import { AgendaPage } from "@/features/appointments/AgendaPage";
import { ClientsPage } from "@/features/clients/ClientsPage";
import { EmployeesPage } from "@/features/admin/EmployeesPage";
import { SettingsPage } from "@/features/settings/SettingsPage";

const router = createBrowserRouter(
  [
    { path: "/login", element: <LoginPage /> },
    { path: "/activate", element: <ActivatePage /> },
    {
      element: (
        <ProtectedRoute>
          <AppShell />
        </ProtectedRoute>
      ),
      children: [
        // Default view is today's agenda.
        { path: "/", element: <AgendaPage /> },
        { path: "/agenda/:date", element: <AgendaPage /> },
        { path: "/clientes", element: <ClientsPage /> },
        {
          path: "/equipe",
          element: (
            <AdminRoute>
              <EmployeesPage />
            </AdminRoute>
          ),
        },
        { path: "/ajustes", element: <SettingsPage /> },
      ],
    },
    { path: "*", element: <Navigate to="/" replace /> },
  ],
  // Opt into v7 behaviour now to keep the console clean and ease upgrading.
  // (v7_startTransition is a RouterProvider-level flag — see below.)
  {
    future: {
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    },
  },
);

export function AppRouter() {
  return <RouterProvider router={router} future={{ v7_startTransition: true }} />;
}
