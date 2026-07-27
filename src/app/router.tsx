import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { AdminRoute, ProtectedRoute, SplashScreen } from "@/components/guards";
import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/features/auth/LoginPage";
import { AgendaPage } from "@/features/appointments/AgendaPage";

/**
 * Code splitting: Login and Agenda are the two entry points, so they stay in
 * the main bundle. Everything else loads on first visit and is then precached
 * by the service worker, keeping the initial download small on mobile data.
 */
const ActivatePage = lazy(() =>
  import("@/features/auth/ActivatePage").then((m) => ({ default: m.ActivatePage })),
);
const ClientsPage = lazy(() =>
  import("@/features/clients/ClientsPage").then((m) => ({ default: m.ClientsPage })),
);
const EmployeesPage = lazy(() =>
  import("@/features/admin/EmployeesPage").then((m) => ({ default: m.EmployeesPage })),
);
const SettingsPage = lazy(() =>
  import("@/features/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);

const router = createBrowserRouter(
  [
    { path: "/login", element: <LoginPage /> },
    {
      path: "/activate",
      // Outside AppShell, so it needs its own Suspense boundary.
      element: (
        <Suspense fallback={<SplashScreen />}>
          <ActivatePage />
        </Suspense>
      ),
    },
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
