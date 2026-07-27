# Frontend Implementation Plan — Esabel Santos Beleza (Salon Internal App)

> **Stack:** Vite + React 18 + TypeScript SPA · TanStack Query + Zustand · Tailwind (CSS-var theming) · React Router v6 · `vite-plugin-pwa` (Workbox, injectManifest) · Framer Motion · `sonner` · `lucide-react` · `@supabase/supabase-js` v2. Deployed as static assets to **Vercel**.
> **Audience:** internal only — Owner (Super Admin) + 7 employees, mobile-first PWA.

---

## Table of Contents
1. [Rationale & Dependencies](#1-rationale--dependencies)
2. [Folder Structure](#2-folder-structure)
3. [Supabase Client & Environment](#3-supabase-client--environment)
4. [State Management Strategy](#4-state-management-strategy)
5. [Auth Flow (username → synthetic email, guards, activation)](#5-auth-flow)
6. [Routing](#6-routing)
7. [Data Layer — TanStack Query + RLS + Realtime](#7-data-layer)
8. [Scheduling UI & the Computed "Concluded" Status](#8-scheduling-ui--computed-status)
9. [Client CRM & Autocomplete](#9-client-crm--autocomplete)
10. [Cancellation Flow + WhatsApp Deep Link](#10-cancellation-flow--whatsapp-deep-link)
11. [Admin — Employee Onboarding UI](#11-admin--employee-onboarding-ui)
12. [PWA Setup (manifest, service worker, install)](#12-pwa-setup)
13. [Push Notifications (client side)](#13-push-notifications-client-side)
14. [Theming, Animation & UX System](#14-theming-animation--ux-system)
15. [Deployment to Vercel](#15-deployment-to-vercel)
16. [Requirements Traceability Matrix](#16-requirements-traceability-matrix)

---

## 1. Rationale & Dependencies

A **Vite React SPA** (not Next.js) is the right fit: the app is fully authenticated/internal with no SEO or SSR need, is real-time and mobile-first, and benefits from the lightest possible build and the simplest PWA story (`vite-plugin-pwa`). It ships as static files Vercel serves from the edge.

```jsonc
// package.json — key dependencies
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "react-router-dom": "^6",
    "@supabase/supabase-js": "^2",
    "@tanstack/react-query": "^5",
    "zustand": "^4",
    "framer-motion": "^11",
    "sonner": "^1",
    "lucide-react": "^0.4xx",
    "date-fns": "^3",           // date math + pt-BR locale
    "clsx": "^2"
  },
  "devDependencies": {
    "vite": "^5",
    "@vitejs/plugin-react": "^4",
    "vite-plugin-pwa": "^0.20",
    "typescript": "^5",
    "tailwindcss": "^3", "postcss": "^8", "autoprefixer": "^10"
  }
}
```

---

## 2. Folder Structure

```
esabel-santos-beleza/
├─ public/
│  ├─ manifest.webmanifest
│  ├─ icons/                     # 192, 512, 512-maskable, apple-touch-icon-180
│  └─ offline.html
├─ src/
│  ├─ main.tsx                   # mount + SW registration
│  ├─ App.tsx                    # <Providers><AppRouter/></Providers>
│  ├─ sw.ts                      # custom service worker (Workbox precache + push handlers)
│  ├─ app/
│  │  ├─ providers.tsx           # QueryClientProvider, ThemeProvider, AuthProvider, <Toaster/>
│  │  └─ router.tsx              # route table + guards
│  ├─ lib/
│  │  ├─ supabase.ts             # typed singleton client
│  │  ├─ queryClient.ts          # QueryClient config + queryKeys factory
│  │  ├─ status.ts               # computeAppointmentStatus() — pure, render-only
│  │  ├─ dates.ts                # day/month helpers, 2-month clamp, pt-BR formatting
│  │  ├─ whatsapp.ts             # phone normalization + deep-link + message templates
│  │  └─ push.ts                 # subscribe/unsubscribe Web Push, upsert push_subscriptions
│  ├─ stores/
│  │  ├─ authStore.ts            # session, profile, role, isAdmin
│  │  └─ uiStore.ts              # theme, active modals, selected date
│  ├─ features/
│  │  ├─ auth/
│  │  │  ├─ LoginPage.tsx
│  │  │  ├─ ActivatePage.tsx
│  │  │  └─ hooks.ts             # useLogin, useLogout, useSession
│  │  ├─ appointments/
│  │  │  ├─ AgendaPage.tsx        # day view (default: today) + month view
│  │  │  ├─ AppointmentCard.tsx
│  │  │  ├─ AppointmentForm.tsx   # create/edit modal
│  │  │  ├─ CancelModal.tsx       # mandatory reason
│  │  │  ├─ DayPager.tsx / MonthGrid.tsx
│  │  │  └─ hooks.ts             # useAppointments, useCreate/Update/Cancel/Reassign
│  │  ├─ clients/
│  │  │  ├─ ClientsPage.tsx
│  │  │  ├─ ClientForm.tsx
│  │  │  ├─ ClientAutocomplete.tsx
│  │  │  └─ hooks.ts             # useClients, useClientSearch, useCreateClient
│  │  ├─ admin/
│  │  │  ├─ EmployeesPage.tsx
│  │  │  ├─ CreateEmployeeForm.tsx
│  │  │  └─ hooks.ts             # useEmployees, useCreateEmployee, useDeleteEmployee
│  │  └─ reminders/
│  │     └─ usePushSetup.ts      # permission + subscription lifecycle
│  ├─ components/
│  │  ├─ ui/                     # Button, Input, Modal, Select, DatePicker, Badge, Skeleton, Switch
│  │  ├─ layout/                 # AppShell, Header, BottomNav
│  │  └─ ThemeToggle.tsx
│  ├─ hooks/
│  │  ├─ useRealtime.ts          # Supabase Realtime → query cache sync
│  │  ├─ useInstallPrompt.ts     # beforeinstallprompt (Android) + iOS instructions
│  │  └─ useMediaQuery.ts
│  ├─ styles/
│  │  └─ globals.css             # Tailwind layers + CSS variables (light/dark palettes)
│  └─ types/
│     ├─ database.types.ts       # supabase gen types (generated)
│     └─ domain.ts               # Appointment, Client, Profile view models + Status union
├─ index.html
├─ vite.config.ts
├─ tailwind.config.ts
├─ vercel.json
└─ .env.local                    # VITE_* (gitignored)
```

---

## 3. Supabase Client & Environment

```ts
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,      // keep refresh token in localStorage → survives app relaunch
      autoRefreshToken: true,    // rolling access-token refresh
      detectSessionInUrl: false, // no email-link flows
      storageKey: 'esb.auth',
    },
  },
);
```

```bash
# .env.local  (Vercel → Project → Environment Variables mirrors these)
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_VAPID_PUBLIC_KEY=<vapid-public-key>
```

> Only public values live here. The 7-day persistence is a joint contract: `persistSession` on the client + `session inactivity timeout = 604800s` in Supabase Auth (see backend plan §3).

---

## 4. State Management Strategy

Two clearly separated concerns:

| Concern | Tool | What lives here |
|---|---|---|
| **Server state** (appointments, clients, employees) | **TanStack Query** | Fetching, caching, background refetch, optimistic mutations, invalidation. Keyed by feature + params. |
| **Client/UI state** | **Zustand** | Auth session/profile/role, theme, selected date, open modals, install-prompt event. |

```ts
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: true, retry: 1 } },
});

export const queryKeys = {
  appointmentsByDay:  (isoDay: string) => ['appointments', 'day', isoDay] as const,
  appointmentsByMonth:(ym: string)     => ['appointments', 'month', ym] as const,
  clients:            ['clients'] as const,
  clientSearch:       (term: string)   => ['clients', 'search', term] as const,
  employees:          ['employees'] as const,
};
```

```ts
// src/stores/authStore.ts
import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import type { Profile } from '@/types/domain';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  ready: boolean;               // gate rendering until initial getSession resolves
  set: (p: Partial<AuthState>) => void;
}
export const useAuthStore = create<AuthState>((set) => ({
  session: null, profile: null, isAdmin: false, ready: false,
  set: (p) => set(p),
}));
```

---

## 5. Auth Flow

### 5.1 Login (username-only UX → synthetic email)

```ts
// src/features/auth/hooks.ts
export function useLogin() {
  return async (username: string, password: string) => {
    const email = `${username.trim().toLowerCase()}@salon.internal`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;    // surfaced as a sonner toast in LoginPage
  };
}
```

### 5.2 Session hydration (AuthProvider)

```ts
// inside app/providers.tsx — AuthProvider
useEffect(() => {
  const hydrate = async (session: Session | null) => {
    if (!session) { useAuthStore.getState().set({ session: null, profile: null, isAdmin: false, ready: true }); return; }
    const { data: profile } = await supabase.from('profiles')
      .select('*').eq('id', session.user.id).single();
    useAuthStore.getState().set({
      session, profile, isAdmin: profile?.role === 'super_admin', ready: true,
    });
  };
  supabase.auth.getSession().then(({ data }) => hydrate(data.session));
  const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => hydrate(session));
  return () => sub.subscription.unsubscribe();
}, []);
```

### 5.3 Route guards

```tsx
// ProtectedRoute: requires a session. AdminRoute: additionally requires isAdmin.
function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { session, ready } = useAuthStore();
  if (!ready) return <SplashScreen />;
  return session ? children : <Navigate to="/login" replace />;
}
function AdminRoute({ children }: { children: JSX.Element }) {
  const { isAdmin, ready } = useAuthStore();
  if (!ready) return <SplashScreen />;
  return isAdmin ? children : <Navigate to="/" replace />;
}
```

### 5.4 Activation (`/activate?token=…`)

`ActivatePage` reads `token` from the query string, collects a new password (with confirm + strength ≥ 8), and calls the `activate-employee` Edge Function:

```ts
await supabase.functions.invoke('activate-employee', { body: { token, password } });
// on success → toast + redirect to /login
```

---

## 6. Routing

```tsx
// src/app/router.tsx
const router = createBrowserRouter([
  { path: '/login',    element: <LoginPage /> },
  { path: '/activate', element: <ActivatePage /> },
  {
    element: <ProtectedRoute><AppShell /></ProtectedRoute>,   // Header + BottomNav + <Outlet/>
    children: [
      { path: '/',              element: <AgendaPage /> },            // defaults to TODAY
      { path: '/agenda/:date',  element: <AgendaPage /> },            // day view, YYYY-MM-DD
      { path: '/agenda/month/:ym', element: <AgendaPage view="month" /> },
      { path: '/clients',       element: <ClientsPage /> },
      { path: '/admin/employees', element: <AdminRoute><EmployeesPage /></AdminRoute> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
```

`BottomNav` (mobile-first) shows **Agenda · Clientes**, plus **Equipe** only when `isAdmin`.

---

## 7. Data Layer

### 7.1 RLS-aware queries (the client never filters for security — RLS does)

Because RLS already scopes writes, the frontend queries *for display* only. Example day fetch (everyone can read all appointments → global agenda):

```ts
// src/features/appointments/hooks.ts
export function useAppointments(isoDay: string) {
  return useQuery({
    queryKey: queryKeys.appointmentsByDay(isoDay),
    queryFn: async () => {
      const start = startOfDayISO(isoDay), end = endOfDayISO(isoDay);
      const { data, error } = await supabase
        .from('appointments')
        .select('*, employee:profiles!appointments_employee_id_fkey(id, full_name)')
        .gte('scheduled_at', start).lte('scheduled_at', end)
        .order('scheduled_at');
      if (error) throw error;
      return data;
    },
  });
}
```

Mutations rely on RLS to authorize; the UI simply reflects success/failure. Create appointment with optimistic insert:

```ts
export function useCreateAppointment(isoDay: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: NewAppointment) => {
      const { data, error } = await supabase.from('appointments').insert(payload).select().single();
      if (error) throw error;   // e.g. RLS denial (assigning to another employee), or window trigger (>2 months)
      return data;
    },
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: queryKeys.appointmentsByDay(isoDay) });
      const prev = qc.getQueryData(queryKeys.appointmentsByDay(isoDay));
      qc.setQueryData(queryKeys.appointmentsByDay(isoDay), (old: any[] = []) =>
        [...old, { ...payload, id: 'optimistic', __optimistic: true }]);
      return { prev };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(queryKeys.appointmentsByDay(isoDay), ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });
}
```

> Error mapping: a Postgres `check_violation` from the 2-month trigger and an RLS denial both surface as errors here → translated to friendly pt-BR toasts (e.g. "Só é possível agendar até 2 meses à frente").

### 7.2 Realtime → cache sync (live multi-device agenda)

```ts
// src/hooks/useRealtime.ts — mounted once inside AppShell
useEffect(() => {
  const channel = supabase.channel('appointments-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' },
      () => queryClient.invalidateQueries({ queryKey: ['appointments'] }))
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, []);
```

When the owner reassigns a sick employee's bookings, or any employee adds/cancels, every open device refetches and re-renders instantly.

---

## 8. Scheduling UI & Computed Status

### 8.1 The computed "Concluded" status (no DB writes, no CRON)

```ts
// src/lib/status.ts
export type DisplayStatus = 'scheduled' | 'concluded' | 'canceled';

/** Pure, render-only. Never written back. */
export function computeAppointmentStatus(
  a: { status: 'scheduled' | 'canceled'; scheduled_at: string },
  now: Date = new Date(),
): DisplayStatus {
  if (a.status === 'canceled') return 'canceled';
  return new Date(a.scheduled_at) < now ? 'concluded' : 'scheduled';
}
```

- `AppointmentCard` calls this to pick a **Badge** (`Agendado` / `Concluído` / `Cancelado`) and card styling (e.g. muted/desaturated for concluded, strikethrough + reason tooltip for canceled).
- Recompute on an interval (e.g. a 60s `now` tick via a small context/store) so cards flip to "Concluído" as time passes without any server round-trip.

### 8.2 Day/month navigation + the 2-month clamp

```ts
// src/lib/dates.ts
export const MAX_AHEAD = () => addMonths(startOfDay(new Date()), 2);   // upper bound (inclusive-ish)
export const canScheduleAt = (d: Date) => d <= MAX_AHEAD();
export const clampCreateDate = (d: Date) => (d > MAX_AHEAD() ? MAX_AHEAD() : d);
```

- **Default view = today.** `DayPager` prev/next; the **next** control is **disabled** once the target day exceeds `MAX_AHEAD()`. Past days remain freely navigable (read-oriented; cards show as concluded/canceled).
- **Month view** (`MonthGrid`): renders a calendar; days beyond 2 months are visually disabled for creation.
- `AppointmentForm` date/time picker `max` is bound to `MAX_AHEAD()`, and submit validates `canScheduleAt()` before calling the mutation. This mirrors the DB trigger (defense in depth).

### 8.3 `AppointmentForm` fields

| Field | Control | Notes |
|---|---|---|
| Client | `ClientAutocomplete` **or** free-text | Select registered client (fills name+phone+`client_id`) or type a one-off name+phone |
| Client phone | phone input | Prefilled from selected client; editable |
| Date & time | datetime picker | `max = MAX_AHEAD()`; default seeded to selected agenda day |
| Service name | text/select | Free text or preset list (e.g. Corte, Escova, Coloração). **No price field.** |
| Employee | select | **Rendered only for super_admin** (assign to anyone). Employees: hidden, defaults to `self` |

---

## 9. Client CRM & Autocomplete

```ts
// src/features/clients/hooks.ts — debounced trigram search (backed by GIN index)
export function useClientSearch(term: string) {
  return useQuery({
    queryKey: queryKeys.clientSearch(term),
    enabled: term.trim().length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients').select('id, full_name, phone')
        .ilike('full_name', `%${term}%`).order('full_name').limit(8);
      if (error) throw error;
      return data;
    },
  });
}
```

- `ClientAutocomplete` debounces input (~250ms), shows matches; selecting one sets `client_id` + snapshots name/phone into the form. A "**+ Novo cliente**" affordance opens `ClientForm` inline (name, phone, birthday) → `useCreateClient` (`created_by = auth.uid()` enforced by RLS).
- `ClientsPage` is the full directory (list/search/edit; birthday captured for future promo campaigns — no promo logic built now).

---

## 10. Cancellation Flow + WhatsApp Deep Link

```ts
// src/lib/whatsapp.ts
export function normalizeBR(phone: string) {
  const d = (phone ?? '').replace(/\D/g, '');
  return d.startsWith('55') ? d : `55${d}`;
}
export function waLink(phone: string, message: string) {
  return `https://wa.me/${normalizeBR(phone)}?text=${encodeURIComponent(message)}`;
}
export function cancellationMessage(o: {
  clientName: string; service: string; when: string; reason: string;
}) {
  return (
`Olá ${o.clientName}! 💇‍♀️ *Esabel Santos Beleza*

Precisamos *cancelar* o seu agendamento:
🗓️ ${o.service} — ${o.when}
📝 Motivo: ${o.reason}

Nos desculpe pelo transtorno. Podemos reagendar quando desejar! 💖`
  );
}
```

**Flow (`CancelModal`, mandatory reason):**

```tsx
// 1) User taps "Cancelar" on an AppointmentCard → opens CancelModal.
// 2) Modal requires a non-empty reason (submit disabled until filled).
// 3) On confirm → useCancelAppointment mutation:
const { error } = await supabase.from('appointments')
  .update({ status: 'canceled', cancellation_reason: reason, canceled_at: new Date().toISOString() })
  .eq('id', appt.id);              // RLS: own row or admin
// 4) On success:
const url = waLink(appt.client_phone, cancellationMessage({
  clientName: appt.client_name, service: appt.service_name,
  when: formatPtBR(appt.scheduled_at), reason,
}));
window.open(url, '_blank');        // opens WhatsApp with pre-filled stylized notice
toast.success('Agendamento cancelado e aviso pronto no WhatsApp');
```

> The `cancel_requires_reason` DB check (backend §6.3) guarantees a canceled row can never exist without a reason, matching the mandatory modal.

---

## 11. Admin — Employee Onboarding UI

`CreateEmployeeForm` (admin only) collects **Name, Username, WhatsApp phone** → calls the `create-employee` Edge Function → receives `{ setup_url, wa_link }`:

```ts
const { data } = await supabase.functions.invoke('create-employee',
  { body: { full_name, username, phone } });
// UI shows:
//  • a "Enviar link pelo WhatsApp" button → window.open(data.wa_link) (deep link to employee's number)
//  • a copyable setup_url fallback
```

`EmployeesPage` lists profiles with status badges (`pending` / `active` / `inactive`) and, per employee:
- **Reenviar link** (re-invoke `create-employee` to mint a fresh token),
- **Remover** → confirmation → `delete-employee` (offers *reassign future appointments to…* select, defaults to soft-deactivate).

---

## 12. PWA Setup

### 12.1 Vite config (injectManifest so we own the SW for push)

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',       // custom SW (src/sw.ts) → precache + push handlers
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectManifest: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'] },
      manifest: {
        name: 'Esabel Santos Beleza',
        short_name: 'ESB Agenda',
        description: 'Agenda interna do salão',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#faf7f5',
        theme_color: '#b76e79',           // rosé/salon accent
        icons: [
          { src: '/icons/192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      devOptions: { enabled: true },
    }),
  ],
});
```

### 12.2 iOS + Android meta (`index.html`)

```html
<meta name="theme-color" content="#b76e79" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#1a1416" media="(prefers-color-scheme: dark)" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="ESB Agenda" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png" />
```

### 12.3 Service worker (`src/sw.ts`)

```ts
/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';
declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);      // app shell only

// Supabase API is NEVER cached (auth'd, live data) — no runtime route registered for it.

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(self.registration.showNotification(data.title ?? 'Lembrete', {
    body: data.body, icon: '/icons/192.png', badge: '/icons/192.png',
    data: { url: data.url ?? '/' }, vibrate: [80, 40, 80],
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil((async () => {
    const clientsArr = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = clientsArr.find((c) => 'focus' in c);
    if (existing) { await (existing as WindowClient).focus(); (existing as WindowClient).navigate(url); }
    else await self.clients.openWindow(url);
  })());
});
```

### 12.4 Install UX (`useInstallPrompt`)

- **Android/Chromium:** capture `beforeinstallprompt`, stash it in `uiStore`, show a subtle "Instalar app" button that calls `prompt()`.
- **iOS Safari:** no programmatic install → show a one-time hint sheet ("Toque em Compartilhar → Adicionar à Tela de Início") since Web Push + reliable reminders **require** the installed PWA.

---

## 13. Push Notifications (client side)

```ts
// src/lib/push.ts
function urlBase64ToUint8Array(base64: string) { /* standard VAPID key conversion */ }

export async function enablePush(userId: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  const perm = await Notification.requestPermission();          // must be triggered by a user gesture
  if (perm !== 'granted') return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
  });
  const json = sub.toJSON();
  await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: json.endpoint!,
    p256dh: json.keys!.p256dh, auth: json.keys!.auth,
    user_agent: navigator.userAgent,
  }, { onConflict: 'endpoint' });
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) { await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint); await sub.unsubscribe(); }
}
```

- `usePushSetup` prompts for permission after login **on a user gesture** (a "Ativar lembretes" button — required by iOS), then calls `enablePush(profile.id)`. `disablePush()` runs on logout.
- **iOS constraints surfaced in-UI:** requires **installed PWA + iOS 16.4+**; if not installed, the reminders card explains how to add to Home Screen. Delivery itself is server-driven (backend §10), so reminders fire even when the app is closed.

---

## 14. Theming, Animation & UX System

### 14.1 CSS-variable theming (`globals.css`)

```css
:root {
  --bg: #faf7f5; --surface: #ffffff; --text: #2b2124;
  --muted: #8a7c80; --accent: #b76e79; --accent-2: #d9a5ac;
  --success: #3f9d6d; --danger: #c0556b; --radius: 14px;
}
.dark {
  --bg: #14100f; --surface: #201a1b; --text: #f4ecee;
  --muted: #a99ca0; --accent: #d9a5ac; --accent-2: #b76e79;
  --success: #57b98a; --danger: #e0778a;
}
/* Tailwind consumes these via theme.extend.colors → e.g. bg-[var(--surface)] */
```

```ts
// ThemeProvider: seed from localStorage → else prefers-color-scheme; toggle adds/removes `.dark` on <html>.
const initial = localStorage.getItem('esb.theme')
  ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
document.documentElement.classList.toggle('dark', initial === 'dark');
```

`ThemeToggle` (sun/moon `lucide-react` icons) flips the class, persists to `localStorage`, and animates with Framer Motion.

### 14.2 Motion & feedback

- **Framer Motion:** page transitions (`AnimatePresence` on route change), modal spring in/out, `AppointmentCard` list stagger, badge morph when a card becomes "Concluído".
- **`sonner` toasts:** success/error/info with salon-styled colors (`--accent`, `--success`, `--danger`); used for login errors, create/cancel, onboarding-link ready, push enabled.
- **Iconography (`lucide-react`):** `Scissors`, `CalendarDays`, `Clock`, `User`, `Users`, `Phone`, `Cake` (birthday), `Bell` (reminders) — consistent, low-clutter.
- **States:** `Skeleton` loaders for agenda/clients; friendly empty states ("Nenhum agendamento para hoje ✂️"); disabled/greyed controls for the 2-month boundary.

---

## 15. Deployment to Vercel

```json
// vercel.json — SPA fallback so client routes (e.g. /agenda/2026-08-01) resolve to index.html
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- **Build:** `vite build` → `dist/`. Vercel project: framework preset **Vite**, output `dist`.
- **Env vars** (Vercel dashboard, all environments): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`.
- **Types:** run `supabase gen types typescript --linked > src/types/database.types.ts` whenever the schema changes.
- **PWA note:** the service worker is served from the same origin (required for scope `/`). `registerType: 'autoUpdate'` keeps clients on the latest build; a small "Atualização disponível" toast can prompt reload if desired.

---

## 16. Requirements Traceability Matrix

| Requirement (brief) | Where satisfied |
|---|---|
| Username/password login, no email | §5.1 synthetic-email mapping |
| 7-day session persistence | §3 `persistSession` + backend inactivity timeout |
| Admin-only onboarding via WhatsApp deep link + setup link | §11 `create-employee` UI → `wa_link`; §5.4 activation |
| Roles enforced in UI | §5.3 guards, §4 `isAdmin`; RLS is the real authority |
| View all appointments (global awareness) | §7.1 unfiltered read (RLS allows) |
| Edit/cancel own; admin edits all + reassign | §7.1 mutations under RLS; §11 reassign on removal |
| CRM: registered clients (name/phone/birthday) + autocomplete + one-off | §9 autocomplete + inline create; §8.3 free-text one-off |
| Today default, day/month pagination, ≤2 months ahead | §8.2 clamp + disabled controls (mirrors DB trigger) |
| Capture name, phone, datetime, service, employee; **no price** | §8.3 form (no price field) |
| Computed "Concluded" (past & not canceled), no CRON writes | §8.1 `computeAppointmentStatus`, 60s tick |
| Mandatory cancel-reason modal + WhatsApp notice | §10 `CancelModal` + `waLink`/`cancellationMessage` |
| Installable PWA (iOS Safari + Android) | §12 manifest, SW, iOS meta, install UX |
| Light/dark toggle, animated salon UI, toasts, iconography | §14 theming + motion + sonner + lucide |
| 20-min reminder reliable on iOS PWA | §13 client subscription + backend §10 server push |

---

*End of frontend implementation plan.*
