import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarX2, ChevronLeft, ChevronRight, LayoutGrid, Lock } from "lucide-react";
import { EmptyState } from "@/components/ui/Feedback";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { useNowTick } from "@/hooks/useNowTick";
import { friendlyError, cn } from "@/lib/cn";
import { fromDateParam, isWithinHorizon, startOfMonth, toDateParam } from "@/lib/dates";
import {
  SLOT_MINUTES_OF_DAY,
  cellKey,
  isHourStart,
  slotDate,
  slotLabel,
  slotOf,
} from "@/lib/grid";
import { isAssignedTo } from "@/lib/services";
import { DayPager } from "./DayPager";
import { MonthGrid } from "./MonthGrid";
import { EmployeeFilter } from "./EmployeeFilter";
import { GridCell, NO_APPOINTMENTS } from "./GridCell";
import { AppointmentForm } from "./AppointmentForm";
import { useAppointmentsByDay, useEmployeeOptions } from "./hooks";
import type { AppointmentWithEmployee } from "@/types/domain";

/** First name only for the column heads — full names blow out the column width. */
function shortName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

/**
 * The paper-agenda view: half-hour rows down, professionals across.
 *
 * SCROLLING — the grid owns its own scroll box (`max-h` + `overflow-auto`)
 * rather than scrolling with the page. That is a requirement, not a preference:
 * `position: sticky` resolves against the nearest scrolling ancestor, and the
 * moment an element gets `overflow-x: auto` the other axis computes to `auto`
 * too, making it that ancestor. A header sticky to the *page* and columns
 * scrolling horizontally inside the same element are mutually exclusive. One
 * scroll box gives both axes a sticky edge and behaves identically on mobile.
 */
export function MasterGridPage() {
  const { date } = useParams<{ date?: string }>();
  const navigate = useNavigate();
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const userId = useAuthStore((s) => s.session?.user.id ?? "");

  // Memoised for the same reason as AgendaPage: a fresh Date every render
  // churns every child that takes it as a prop.
  const day = useMemo(() => fromDateParam(date), [date]);
  const now = useNowTick(60_000);

  const [showMonth, setShowMonth] = useState(false);
  const [month, setMonth] = useState(() => startOfMonth(day));
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentWithEmployee | null>(null);
  const [seed, setSeed] = useState<{ scheduledAt?: Date; employeeId?: string }>({});

  const showAll = useUIStore((s) => s.gridShowAllEmployees);
  const toggleShowAll = useUIStore((s) => s.toggleGridShowAll);
  const overrides = useUIStore((s) => s.gridEmployeeOverrides);
  const setOverride = useUIStore((s) => s.setGridEmployeeOverride);

  // Everyone needs the columns — the grid's whole purpose is team-wide
  // visibility, so this is not gated on isAdmin the way the booking form's
  // picker is. RLS already allows every authenticated user to read profiles.
  const { data: employees } = useEmployeeOptions(true);
  const { data: appointments, isLoading, isError, error } = useAppointmentsByDay(day);

  /** id → how many (non-canceled) appointments that professional has that day. */
  const countsByEmployee = useMemo(() => {
    const tally = new Map<string, number>();
    for (const appointment of appointments ?? []) {
      if (appointment.status === "canceled") continue;
      // Counted for every assigned professional, so a split booking marks both
      // of them as "on shift" and neither column gets auto-hidden.
      const staff = new Set<string>([
        appointment.employee_id,
        ...(appointment.service_employee_ids ?? []),
      ]);
      for (const id of staff) tally.set(id, (tally.get(id) ?? 0) + 1);
    }
    return tally;
  }, [appointments]);

  /**
   * Auto-hiding is suspended when nobody has an appointment.
   *
   * Without this an empty day hides every column, leaving an empty grid with
   * nothing to click — the owner could not book the first appointment of the day
   * from this tab at all. Also suspended while the day is still loading, so
   * columns don't flash in as the data lands.
   */
  const autoRuleSuspended = isLoading || countsByEmployee.size === 0;

  const visibleEmployees = useMemo(() => {
    const list = employees ?? [];
    return list.filter((e) => {
      const override = overrides[e.id];
      if (override !== undefined) return override; // an explicit choice always wins
      if (showAll || autoRuleSuspended) return true;
      return (countsByEmployee.get(e.id) ?? 0) > 0;
    });
  }, [employees, overrides, showAll, autoRuleSuspended, countsByEmployee]);

  const visibleIds = useMemo(
    () => new Set(visibleEmployees.map((e) => e.id)),
    [visibleEmployees],
  );

  /**
   * cellKey → appointments, built once per data change.
   *
   * Canceled appointments are deliberately excluded: the grid answers "who is
   * free?", and a canceled booking frees its slot. This also keeps the grid
   * consistent with the conflict check, which ignores canceled rows too.
   *
   * An appointment is placed under EVERY professional assigned to it, so a
   * split booking correctly occupies both their columns.
   */
  const cells = useMemo(() => {
    const map = new Map<string, AppointmentWithEmployee[]>();
    for (const appointment of appointments ?? []) {
      if (appointment.status === "canceled") continue;
      const slot = slotOf(appointment.scheduled_at, day);
      if (slot === null) continue;

      const staff = new Set<string>([
        appointment.employee_id,
        ...(appointment.service_employee_ids ?? []),
      ]);
      for (const employeeId of staff) {
        const key = cellKey(employeeId, slot);
        const bucket = map.get(key);
        if (bucket) bucket.push(appointment);
        else map.set(key, [appointment]);
      }
    }
    return map;
  }, [appointments, day]);

  /** Appointments that fall outside 09:00–18:00 would otherwise be invisible. */
  const outsideHours = useMemo(
    () =>
      (appointments ?? []).filter(
        (a) => a.status !== "canceled" && slotOf(a.scheduled_at, day) === null,
      ).length,
    [appointments, day],
  );

  const nowMs = now.getTime();
  const columns = visibleEmployees.length;

  /**
   * Whether ANY empty cell renders as clickable — both roles now, gated only
   * on the day being bookable. Offering a cell past the 2-month horizon would
   * open a form that can never submit, so that check stays here rather than
   * moving into the per-click authorization below.
   *
   * WHO a click is actually allowed to book for is a separate question,
   * answered per-cell in `handleBook` — see the note there for why the two are
   * split.
   */
  const canBook = isWithinHorizon(day);

  function goToDay(next: Date) {
    navigate(`/grade/${toDateParam(next)}`);
    setMonth(startOfMonth(next));
  }

  // Stable identities — these are handed to every memoised cell.
  const handleBook = useCallback(
    (employeeId: string, minutesOfDay: number) => {
      /*
        Employees may book, but only their own column. Checked HERE — at the
        moment of the click — rather than by rendering a different cell for
        "your column" vs "everyone else's": every empty cell then looks and
        behaves identically regardless of who is looking at it (no per-role
        grid variant to keep in sync), and the restriction is explained by the
        toast the one time it's actually relevant, instead of a grid that's
        silently half-disabled with no explanation.

        The server enforces the same rule independently (the completion
        trigger rejects a non-admin assigning work to anyone else), so this is
        UX, not the real gate — same relationship as the 2-month horizon.
      */
      if (!isAdmin && employeeId !== userId) {
        toast.error("Não autorizado, apenas admin.");
        return;
      }
      setEditing(null);
      setSeed({ scheduledAt: slotDate(day, minutesOfDay), employeeId });
      setFormOpen(true);
    },
    [day, isAdmin, userId],
  );

  const handleOpen = useCallback(
    (appointment: AppointmentWithEmployee) => {
      /*
        Owner may open anything; an employee only an appointment they're
        assigned to. `isAssignedTo` is the same predicate AppointmentCard uses
        for its edit/cancel permission, so "editable from the grid" and
        "editable from the Agenda tab" can never disagree.

        This mirrors handleBook's defense-in-depth: GridCell's `canOpen` prop
        already prevents the click from firing in the ordinary case (a
        teammate's column renders as an inert div), but re-checking here means
        the real rule lives in one place instead of trusting the render layer.
      */
      if (!isAdmin && !isAssignedTo(appointment, userId)) {
        toast.error("Não autorizado, apenas admin.");
        return;
      }
      setSeed({});
      setEditing(appointment);
      setFormOpen(true);
    },
    [isAdmin, userId],
  );

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditing(null);
    setSeed({});
  }, []);

  /**
   * Desktop horizontal scroll controls.
   *
   * A mouse wheel only scrolls vertically, so on a desktop the columns past the
   * viewport edge are effectively unreachable without a trackpad gesture or
   * dragging a thin scrollbar. Touch devices already swipe, hence `md:` only.
   *
   * Rendered only when the content actually overflows — measured, not guessed
   * from a column-count heuristic, because column width depends on the
   * container. One boolean, updated by an observer, so it costs nothing per frame.
   */
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollX, setCanScrollX] = useState(false);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) {
      setCanScrollX(false);
      return;
    }
    const measure = () => setCanScrollX(node.scrollWidth - node.clientWidth > 4);
    measure();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    // The inner grid changes width when columns are toggled, which does not
    // resize the scroller itself.
    if (node.firstElementChild) observer.observe(node.firstElementChild);
    return () => observer.disconnect();
  }, [columns]);

  const scrollByColumns = useCallback((direction: 1 | -1) => {
    const node = scrollerRef.current;
    if (!node) return;
    // Roughly two columns, but never more than a screenful.
    const step = Math.min(node.clientWidth * 0.8, 320);
    node.scrollBy({ left: direction * step, behavior: "smooth" });
  }, []);

  return (
    <div>
      <DayPager day={day} onChange={goToDay} onOpenMonth={() => setShowMonth((v) => !v)} />

      {showMonth && (
        <MonthGrid
          month={month}
          selected={day}
          onMonthChange={setMonth}
          onSelectDay={(selected) => {
            goToDay(selected);
            setShowMonth(false);
          }}
        />
      )}

      {employees && employees.length > 0 && (
        <EmployeeFilter
          employees={employees}
          visibleIds={visibleIds}
          counts={countsByEmployee}
          showAll={showAll}
          onToggleShowAll={toggleShowAll}
          onToggleEmployee={setOverride}
          autoRuleSuspended={autoRuleSuspended}
        />
      )}

      {!isAdmin && (
        <p className="mb-3 flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          Na sua coluna você pode agendar horários livres e editar seus
          agendamentos. As demais são somente leitura.
        </p>
      )}

      {isError ? (
        <EmptyState
          icon={<CalendarX2 className="h-8 w-8" />}
          title="Não foi possível carregar"
          description={friendlyError(error)}
        />
      ) : columns === 0 ? (
        <EmptyState
          icon={<LayoutGrid className="h-8 w-8" />}
          title="Nenhuma profissional na grade"
          description={
            employees && employees.length > 0
              ? "Todas estão ocultas. Use “Mostrar todas” acima ou toque em um nome."
              : "Cadastre a equipe para montar a grade."
          }
        />
      ) : (
        <>
        {/*
          Desktop-only scroll controls. Hidden on touch, where swiping already
          works, and hidden entirely when nothing overflows.
        */}
        {canScrollX && (
          <div className="mb-2 hidden items-center justify-end gap-1.5 md:flex">
            <span className="mr-auto text-[11px] text-muted">
              Arraste ou use as setas para ver as outras profissionais
            </span>
            <button
              type="button"
              onClick={() => scrollByColumns(-1)}
              aria-label="Rolar para a esquerda"
              className="rounded-lg border border-border p-1.5 text-muted transition hover:border-accent/40 hover:text-accent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollByColumns(1)}
              aria-label="Rolar para a direita"
              className="rounded-lg border border-border p-1.5 text-muted transition hover:border-accent/40 hover:text-accent"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        <div
          ref={scrollerRef}
          className={cn(
            // 21rem covers the app header, day pager, filter card and the space
            // the bottom nav occupies; mb-4 then keeps a visible gap above the
            // nav instead of the grid ending flush against it.
            "relative mb-4 max-h-[calc(100dvh-21rem)] min-h-[16rem] overflow-auto",
            "overscroll-contain rounded-lg border border-border bg-surface",
            isLoading && "opacity-60",
          )}
        >
          <div
            className="grid"
            style={{
              // Hour rail + one column per professional.
              //
              // No `min-w-max` here on purpose: that would size the grid to its
              // content, so a long client name would widen its whole column and
              // defeat the `truncate` inside the cells. The 7.5rem floor is what
              // produces the horizontal overflow — when the columns no longer
              // fit, the track can't shrink past it and the box scrolls.
              gridTemplateColumns: `3.75rem repeat(${columns}, minmax(8.5rem, 1fr))`,
            }}
          >
            {/* Corner: above the rail and left of the header, so it needs both stickies. */}
            <div className="sticky left-0 top-0 z-30 grid-rail border-b border-r border-border bg-surface" />

            {visibleEmployees.map((employee) => (
              <div
                key={employee.id}
                title={employee.full_name}
                // min-w-0: a grid item defaults to min-width:auto, which is its
                // min-content width — `truncate` cannot clip without this.
                className="sticky top-0 z-20 min-w-0 truncate border-b border-r border-border bg-surface px-2 py-2.5 text-center text-xs font-semibold text-text"
              >
                {shortName(employee.full_name)}
                {employee.status === "pending" && (
                  <span className="ml-1 text-[10px] font-normal text-warning">•</span>
                )}
              </div>
            ))}

            {SLOT_MINUTES_OF_DAY.map((minutesOfDay) => {
              const hourStart = isHourStart(minutesOfDay);
              const slotPast = slotDate(day, minutesOfDay).getTime() < nowMs;
              return (
                <Fragment key={minutesOfDay}>
                  <div
                    className={cn(
                      "sticky left-0 z-10 grid-rail flex items-center justify-center",
                      "border-b border-r border-border bg-surface tabular-nums",
                      hourStart
                        ? "text-xs font-semibold text-text"
                        : "text-[11px] font-medium text-muted",
                    )}
                  >
                    {slotLabel(minutesOfDay)}
                  </div>

                  {visibleEmployees.map((employee) => (
                    <GridCell
                      key={employee.id}
                      appointments={
                        cells.get(cellKey(employee.id, minutesOfDay)) ?? NO_APPOINTMENTS
                      }
                      employeeId={employee.id}
                      minutesOfDay={minutesOfDay}
                      canBook={canBook}
                      // Owner opens any column; an employee only their own —
                      // and by construction every appointment bucketed into
                      // their column is one they're assigned to. See the note
                      // on GridCell's `canOpen` prop.
                      canOpen={isAdmin || employee.id === userId}
                      onBook={handleBook}
                      onOpen={handleOpen}
                      slotPast={slotPast}
                    />
                  ))}
                </Fragment>
              );
            })}
          </div>
        </div>
        </>
      )}

      {outsideHours > 0 && (
        <p className="mt-2 text-xs text-muted">
          {outsideHours}{" "}
          {outsideHours === 1 ? "agendamento fora" : "agendamentos fora"} do horário
          comercial (09:00–18:00) — visível na aba Agenda.
        </p>
      )}

      <AppointmentForm
        open={formOpen}
        onClose={closeForm}
        appointment={editing}
        defaultDate={day}
        seedScheduledAt={seed.scheduledAt}
        seedEmployeeId={seed.employeeId}
      />
    </div>
  );
}
