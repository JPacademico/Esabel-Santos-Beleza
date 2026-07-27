# Esabel Santos Beleza — UI

Internal salon agenda PWA. React + TypeScript + Vite, talking directly to
Supabase (auth, data, realtime) with **Row Level Security as the authority** —
there is no API layer of our own.

> Backend setup lives in [`../Esabel-Santos-Beleza-Server/SETUP.md`](../Esabel-Santos-Beleza-Server/SETUP.md).
> Do that first; this app needs the schema, RLS and Edge Functions in place.

---

## Quick start

```bash
npm install
```

Create `.env.local` (copy from `.env.example`) with the three public values from
**Supabase → Project Settings → API** plus your VAPID public key:

```
VITE_SUPABASE_URL="https://<project-ref>.supabase.co"
VITE_SUPABASE_ANON_KEY="<anon-public-key>"
VITE_VAPID_PUBLIC_KEY="<vapid-public-key>"
```

Then:

```bash
npm run dev
```

Open http://localhost:5173 and sign in with the owner account you bootstrapped
(username only — no email).

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server on :5173 (service worker enabled) |
| `npm run build` | Type-check then production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | `tsc --noEmit` type-check |
| `npm run icons` | Regenerate PWA PNG icons from `public/icons/favicon.svg` |
| `npm run types` | Regenerate `src/types/database.types.ts` from the linked Supabase project |

---

## Architecture

```
src/
├─ app/            providers (Query, Auth, Toaster) + router
├─ lib/            supabase, queryClient, status, dates, whatsapp, push, cn
├─ stores/         authStore (session/profile/role), uiStore (theme/install)
├─ features/
│  ├─ auth/         LoginPage, ActivatePage
│  ├─ appointments/ AgendaPage, Card, Form, CancelModal, DayPager, MonthGrid
│  ├─ clients/      ClientsPage, ClientForm, ClientAutocomplete
│  ├─ admin/        EmployeesPage, CreateEmployeeForm
│  ├─ reminders/    usePushSetup
│  └─ settings/     SettingsPage
├─ components/     ui primitives, layout shell, guards
├─ hooks/          useRealtime, useNowTick, useInstallPrompt
└─ sw.ts           service worker: precache + push handlers
```

**State split:** TanStack Query owns all server state (appointments, clients,
employees); Zustand owns session/profile/role and UI state (theme, install
prompt). Realtime subscriptions invalidate Query caches so every device stays in
sync.

## Key behaviours

### Username-only login
Usernames map to synthetic emails (`user@salon.internal`) inside
[`lib/supabase.ts`](src/lib/supabase.ts). The UI never shows an email. Sessions
persist 7 days (`persistSession` here + a 7-day inactivity timeout server-side).

### "Concluído" is computed, never stored
[`lib/status.ts`](src/lib/status.ts) derives the display status at render time:
canceled → `canceled`; else past → `concluded`; else `scheduled`. A 60-second
tick (`useNowTick`) flips cards as time passes. **No CRON, no status writes.**
The database only ever stores `scheduled` or `canceled`.

### 2-month booking horizon
Enforced twice: the UI disables navigation/creation past the limit
([`lib/dates.ts`](src/lib/dates.ts)), and a database trigger rejects it. The UI
clamp is convenience; the trigger is the guarantee.

### Cancellation → WhatsApp
Cancelling opens a modal that **requires** a reason, writes
`status/cancellation_reason/canceled_at`, then opens a `wa.me` deep link with a
pre-written pt-BR notice ([`lib/whatsapp.ts`](src/lib/whatsapp.ts)).

### Permissions
The UI hides admin-only affordances, but **RLS is the real enforcement**.
Employees may only mutate their own appointments; the owner may mutate all and
reassign `employee_id`. Everyone can *read* every appointment (global awareness).

### Reminders (20 min before)
Delivery is server-side (pg_cron → Edge Function → Web Push). This app only
registers the device ([`lib/push.ts`](src/lib/push.ts)) and renders the
notification in [`sw.ts`](src/sw.ts).

> **iOS:** Web Push requires the PWA to be **installed to the Home Screen** on
> **iOS 16.4+**, and permission must be requested from a user gesture — which is
> why the toggle lives in Ajustes rather than firing automatically on login.

---

## Deploying to Vercel

1. Import the repo; set **Root Directory** to `Esabel-Santos-Beleza-UI`.
2. Framework preset **Vite** (`vercel.json` already sets build/output/rewrites).
3. Add the three `VITE_*` environment variables.
4. Deploy, then set the backend's `APP_BASE_URL` secret to the deployed origin so
   employee activation links point at production:

```bash
supabase secrets set APP_BASE_URL="https://<your-domain>"
```

## Routes

| Path | Access | Purpose |
|---|---|---|
| `/login` | public | Username + password |
| `/activate?token=` | public | Employee sets their password |
| `/` | auth | Today's agenda (default view) |
| `/agenda/:date` | auth | Specific day (`yyyy-MM-dd`) |
| `/clientes` | auth | Client directory (CRM) |
| `/equipe` | **admin** | Create/deactivate employees |
| `/ajustes` | auth | Theme, reminders, install, logout |
