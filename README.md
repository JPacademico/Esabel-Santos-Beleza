# Studio Esabel Santos — UI

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
| `npm run icons` | Regenerate favicon/PWA PNG icons from `branding/logo.jpg` |
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

### "Concluído" is marked explicitly
All three statuses are **stored**. Completion is an action taken by the owner or
an assigned professional, exactly like cancellation.

It used to be computed (past AND not canceled), which equated "the time passed"
with "it happened" — a no-show, or a client who cancelled *after* the booked
hour, was indistinguishable from one who was served. That was the reason for the
change.

A past appointment still sitting at `scheduled` is therefore **awaiting
confirmation**: [`isAwaitingCompletion()`](src/lib/status.ts) flags it, the card
shows a warning "Confirmar" badge, and the day header counts them. It is not a
fourth status and gets no list of its own — it is a prompt for action, so it
stays under "Agendados". This is the only reason the agenda still keeps a
60-second tick (`useNowTick`).

Invariants live in the database, not just the UI: `concluded_at` is required
when concluded and cleared otherwise, cancellation fields and completion are
mutually exclusive, and nothing can be marked concluded with a future date
(which also blocks rescheduling a concluded appointment forward). Still **no
CRON** — nothing sweeps statuses on a timer.

### 2-month booking horizon
Enforced twice: the UI disables navigation/creation past the limit
([`lib/dates.ts`](src/lib/dates.ts)), and a database trigger rejects it. The UI
clamp is convenience; the trigger is the guarantee.

### Multiple services per appointment
A booking carries a list ("Manicure + Pedicure"), edited with
[`ServicePicker`](src/features/appointments/ServicePicker.tsx). `services text[]`
is the source of truth; the database keeps the legacy `service_name` column in
sync as the joined display string, which is what push notifications read.
[`lib/services.ts`](src/lib/services.ts) falls back to splitting that string for
any payload predating the column.

### Agenda filtering
Two independent filters, both held in `uiStore` rather than page state — the
app shell keys the page subtree on the pathname, so local state would reset
every time you page to another day.

- **Scope** (`Todos` / `Só os meus`) — [`isAssignedTo()`](src/lib/services.ts)
  is the single definition of "mine", shared with the card's edit/cancel
  permission check so the list you see and the rows you can act on can't
  disagree. A split appointment counts as *everyone's* who performs part of it.
- **Status tabs** (`Agendados` / `Concluídos` / `Cancelados`) — the day is split
  into three lists so finished and canceled work doesn't bury what's pending.
  Counts stay visible on every tab because "Agendados" is the default and a
  past day would otherwise look empty.

### Per-service professionals (admin only)
An appointment can be split across staff — one service with one professional,
another with someone else. `service_employee_ids` runs positionally parallel to
`services`; `employee_id` stays the **lead** (element 0) so RLS, indexes and
reminders are untouched. The admin UI keeps the single-dropdown case as the
default and puts splitting behind a toggle, since almost every booking is one
professional doing everything. Employees always book for themselves — enforced
by a DB trigger, not just the UI.

### Optional client phone
The phone is optional — walk-ins often don't leave one. `hasWhatsApp()` in
[`lib/whatsapp.ts`](src/lib/whatsapp.ts) is the single predicate gating every
WhatsApp affordance; without a usable number the button on the card renders
**disabled** (not hidden, so the absence is legible) and cancelling records the
reason without offering to notify anyone. A *partially* typed number is rejected
by the form rather than saved, since it would enable a button that opens on a
number nobody owns.

### Cancellation → WhatsApp
Cancelling opens a modal that **requires** a reason, writes
`status/cancellation_reason/canceled_at`, then — when a phone is on file —
opens a `wa.me` deep link with a pre-written pt-BR notice
([`lib/whatsapp.ts`](src/lib/whatsapp.ts)).

### Brand name
The salon's public name lives in [`lib/brand.ts`](src/lib/brand.ts) because it
appears in several outgoing client messages. Three files can't import it and
carry the literal: `index.html`, `vite.config.ts` (manifest) and `src/sw.ts`.
The server repeats it in `supabase/functions/_shared/brand.ts` — change both.

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
