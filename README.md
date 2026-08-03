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

### Master grid (`/grade`)
The paper-agenda view: half-hour rows 09:00–18:00 down, professionals across.
[`lib/grid.ts`](src/lib/grid.ts) owns the slot maths so the component stays
presentational.

**The grid owns its own scroll box** (`max-h` + `overflow-auto`) rather than
scrolling with the page, and that is forced rather than chosen: `position:
sticky` resolves against the nearest scrolling ancestor, and the moment an
element gets `overflow-x: auto` the other axis computes to `auto` too, making it
that ancestor. A header sticky to the *page* while columns scroll horizontally
inside the same element are mutually exclusive. One scroll box gives both axes a
sticky edge — header `top-0`, hour rail `left-0` with `.grid-rail`'s shadow — and
behaves the same on mobile.

Canceled appointments are excluded (a cancellation frees the slot), and a split
booking occupies **every** assigned professional's column. Appointments outside
business hours are counted in a footnote rather than silently dropped.

Booking an empty cell is gated on the day being within the 2-month horizon —
that part applies to both roles equally, since offering a cell past the horizon
would open a form that can never submit. **Who** a click is allowed to book for
is a separate, later check: the owner may book any column, an employee only
their own. Every empty cell renders identically for both roles (no per-role grid
variant to keep in sync); an employee tapping someone else's column gets a
"Não autorizado, apenas admin." toast instead of the form opening. The server
enforces the same rule independently (the completion trigger rejects a non-admin
assigning work to anyone else), so the toast is UX, not the real gate.

Opening an *existing* appointment follows the same shape: the owner may open any
column, an employee only their own. This works with no per-appointment check at
the cell layer, because bucketing already only places an appointment into a
column for professionals assigned to it (see `cells` above) — "this is my
column" and "I'm assigned to whatever's in it" are the same fact by
construction. `handleOpen` still re-checks with
[`isAssignedTo()`](src/lib/services.ts) as a defense-in-depth safety net — the
same predicate `AppointmentCard` uses for its edit/cancel permission, so
"editable from the grid" and "editable from the Agenda tab" can never disagree.
A column that isn't yours renders as plain divs, not disabled buttons, so a
screenful of dead controls doesn't sit in the tab order.

**Column visibility has two layers.** By default a professional with no
appointments that day is hidden, keeping the grid to whoever is on shift.
`gridShowAllEmployees` lifts that rule; `gridEmployeeOverrides` is the
per-professional escape hatch and always wins. The escape hatch is required, not
a nicety: without it a professional with an empty day has no column, so she
could never be booked from this tab. The auto rule is also **suspended while
loading and when nobody has any appointment** — otherwise an empty day hides
every column and there is nothing to book against.

On desktop the grid gets explicit ‹ › scroll buttons, because a mouse wheel only
scrolls vertically and the columns past the edge are otherwise reachable only by
dragging a thin scrollbar. They are `md:`-only (touch already swipes) and appear
only when the content genuinely overflows — measured with a `ResizeObserver` on
both the scroller and the inner grid, since toggling columns changes the grid's
width without resizing the scroller.

**Re-render discipline** ([`GridCell`](src/features/appointments/GridCell.tsx) is
memoised): empty cells share one frozen `NO_APPOINTMENTS` array so a data change
doesn't churn them, callbacks are `useCallback`-stable, and the "past" tint comes
from a `slotPast` **boolean per row** rather than a `now: Date` per cell — a Date
prop would re-render all ~150 cells every minute.

### Double-booking warning
A soft block, not a rule. [`fetchSlotConflicts`](src/features/appointments/hooks.ts)
runs at submit time inside `AppointmentForm`, so it covers **both** the grid and
the day agenda by construction. It checks `service_employee_ids` as well as the
lead, since every professional on a split booking is genuinely busy.

Three deliberate choices: it is imperative rather than a `useQuery` (a cached
answer is worse than none when the point is what another device just booked); the
warning reuses the same modal via a two-step body, like `CancelModal`, instead of
stacking overlays; and **if the check itself fails, the save proceeds** — refusing
to book because we couldn't *warn* would be worse than the double booking. With
no duration field, "occupied" can only honestly mean "another appointment starts
in the same half-hour", which is exactly one grid cell.

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
The reason is **optional** — a one-tap "quick cancel" with nothing typed is a
normal, supported call, not an incomplete one (owner request; it used to be
mandatory). Cancelling writes `status/canceled_at` and `cancellation_reason`
(null if left blank), then — when a phone is on file — opens a `wa.me` deep
link with a pre-written pt-BR notice ([`lib/whatsapp.ts`](src/lib/whatsapp.ts));
the message includes the "Motivo" line only when one was actually given. Only
`canceled_at` is required by the DB (`cancel_requires_timestamp`) — the same
shape as `concluded_at` on completion.

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
| `/grade`, `/grade/:date` | auth | Master grid — read-only for employees |
| `/clientes` | auth | Client directory (CRM) |
| `/equipe` | **admin** | Create/deactivate employees |
| `/ajustes` | auth | Theme, reminders, install, logout |
