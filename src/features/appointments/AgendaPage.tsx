import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarCheck, CalendarPlus, CalendarX2, Filter, Plus } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/Button";
import { AppointmentSkeleton, EmptyState } from "@/components/ui/Feedback";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { useNowTick } from "@/hooks/useNowTick";
import { computeAppointmentStatus, type DisplayStatus } from "@/lib/status";
import { fromDateParam, isWithinHorizon, startOfMonth, toDateParam } from "@/lib/dates";
import { friendlyError, cn } from "@/lib/cn";
import { isAssignedTo } from "@/lib/services";
import { DayPager } from "./DayPager";
import { MonthGrid } from "./MonthGrid";
import { AppointmentCard } from "./AppointmentCard";
import { AppointmentForm } from "./AppointmentForm";
import { CancelModal } from "./CancelModal";
import { StatusTabs, STATUS_ORDER, STATUS_TAB_LABEL } from "./StatusTabs";
import { useAppointmentsByDay, useDeleteAppointment, useEmployeeNames } from "./hooks";
import type { AppointmentWithEmployee } from "@/types/domain";

export function AgendaPage() {
  const { date } = useParams<{ date?: string }>();
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.session?.user.id);

  // The visible day comes from the URL so it survives refresh and deep links.
  //
  // Memoised on the URL param, not recomputed per render: `day` is passed down
  // as a prop, and a fresh Date identity every render makes it look like the
  // day changed. The 60s tick below re-renders this component constantly, so
  // an unmemoised Date would churn every child that depends on it.
  const day = useMemo(() => fromDateParam(date), [date]);
  const now = useNowTick(60_000); // re-derives "Concluído" as time passes

  const [showMonth, setShowMonth] = useState(false);
  const [month, setMonth] = useState(() => startOfMonth(day));
  // Filters live in the UI store, not local state: the app shell remounts this
  // page on every navigation (see AppShell's `key={location.pathname}`), so
  // local state would reset each time you page to another day.
  const scope = useUIStore((s) => s.agendaScope);
  const setScope = useUIStore((s) => s.setAgendaScope);
  const statusTab = useUIStore((s) => s.agendaStatus);
  const setStatusTab = useUIStore((s) => s.setAgendaStatus);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentWithEmployee | null>(null);
  const [canceling, setCanceling] = useState<AppointmentWithEmployee | null>(null);

  const { data: appointments, isLoading, isError, error } = useAppointmentsByDay(day);
  // Fetched once here rather than per card, so a day's worth of cards share it.
  const { data: staffNames } = useEmployeeNames();
  const deleteMutation = useDeleteAppointment();

  const visible = useMemo(() => {
    const list = appointments ?? [];
    if (scope !== "mine" || !userId) return list;
    // Shares its definition of "mine" with the card's permission check, so a
    // split appointment shows up for every professional performing part of it.
    return list.filter((a) => isAssignedTo(a, userId));
  }, [appointments, scope, userId]);

  // Status is derived once here so cards receive a stable string rather than
  // the ticking clock — see the note in AppointmentCard.
  const rows = useMemo(
    () => visible.map((a) => ({ appointment: a, status: computeAppointmentStatus(a, now) })),
    [visible, now],
  );

  const counts = useMemo(() => {
    const tally: Record<DisplayStatus, number> = { scheduled: 0, concluded: 0, canceled: 0 };
    for (const row of rows) tally[row.status]++;
    return tally;
  }, [rows]);

  // The list actually rendered: one status at a time, so a day's finished and
  // canceled work doesn't bury what still needs doing.
  const shown = useMemo(() => rows.filter((row) => row.status === statusTab), [rows, statusTab]);

  /**
   * When the selected tab is empty but the day isn't, which tab to point at.
   * Follows STATUS_ORDER so "Agendados" is offered before "Concluídos" before
   * "Cancelados" — the same priority the tabs themselves are laid out in.
   */
  const elsewhere = useMemo(
    () => STATUS_ORDER.find((s) => s !== statusTab && counts[s] > 0),
    [counts, statusTab],
  );

  function goToDay(next: Date) {
    navigate(`/agenda/${toDateParam(next)}`);
    setMonth(startOfMonth(next));
  }

  function openCreate() {
    if (!isWithinHorizon(day)) {
      toast.error("Só é possível agendar até 2 meses à frente.");
      return;
    }
    setEditing(null);
    setFormOpen(true);
  }

  // Stable identities keep the memoised cards from re-rendering.
  const handleEdit = useCallback((appointment: AppointmentWithEmployee) => {
    setEditing(appointment);
    setFormOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (appointment: AppointmentWithEmployee) => {
      if (!window.confirm(`Excluir definitivamente o agendamento de ${appointment.client_name}?`)) {
        return;
      }
      try {
        await deleteMutation.mutateAsync(appointment.id);
        toast.success("Agendamento excluído.");
      } catch (err) {
        toast.error(friendlyError(err));
      }
    },
    [deleteMutation],
  );

  return (
    <div>
      <DayPager day={day} onChange={goToDay} onOpenMonth={() => setShowMonth((v) => !v)} />

      <AnimatePresence initial={false}>
        {showMonth && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <MonthGrid
              month={month}
              selected={day}
              onMonthChange={setMonth}
              onSelectDay={(selected) => {
                goToDay(selected);
                setShowMonth(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Whose appointments — applied before the status split, so the tab
          counts always describe the list you're actually looking at. */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs text-muted">
          {visible.length} {visible.length === 1 ? "agendamento" : "agendamentos"} no dia
        </span>

        <button
          onClick={() => setScope(scope === "all" ? "mine" : "all")}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
            scope === "mine"
              ? "border-accent/30 bg-accent/10 text-accent"
              : "border-border text-muted hover:text-text",
          )}
        >
          <Filter className="h-3.5 w-3.5" />
          {scope === "mine" ? "Só os meus" : "Todos"}
        </button>
      </div>

      <StatusTabs value={statusTab} onChange={setStatusTab} counts={counts} />

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          <AppointmentSkeleton />
          <AppointmentSkeleton />
          <AppointmentSkeleton />
        </div>
      ) : isError ? (
        <EmptyState
          icon={<CalendarX2 className="h-8 w-8" />}
          title="Não foi possível carregar"
          description={friendlyError(error)}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<CalendarPlus className="h-8 w-8" />}
          title="Nenhum agendamento ✂️"
          description={
            scope === "mine"
              ? "Você não tem atendimentos neste dia."
              : "Ainda não há atendimentos marcados para este dia."
          }
          action={
            isWithinHorizon(day) ? (
              <Button onClick={openCreate} pulse>
                <Plus className="h-4 w-4" />
                Novo agendamento
              </Button>
            ) : undefined
          }
        />
      ) : shown.length === 0 ? (
        /*
          The day has appointments, just none in this tab — the common case
          being a past day where everything already counts as concluded. Point
          at where they went instead of showing a bare "nothing here".
        */
        <EmptyState
          icon={<CalendarCheck className="h-8 w-8" />}
          title={`Nada em ${STATUS_TAB_LABEL[statusTab]}`}
          description={
            elsewhere
              ? `Este dia tem ${counts[elsewhere]} ${STATUS_TAB_LABEL[elsewhere].toLowerCase()}.`
              : "Nenhum agendamento nesta situação."
          }
          action={
            elsewhere ? (
              <Button variant="secondary" onClick={() => setStatusTab(elsewhere)}>
                Ver {STATUS_TAB_LABEL[elsewhere].toLowerCase()}
              </Button>
            ) : undefined
          }
        />
      ) : (
        /*
          Keyed by tab so a status change is a clean remount rather than a
          simultaneous exit+enter of every card, and `initial={false}` keeps
          that remount from firing an entrance animation per card. The single
          .list-swap transform on the container carries the transition instead.
        */
        <div key={statusTab} className="list-swap space-y-3">
          <AnimatePresence initial={false} mode="popLayout">
            {shown.map(({ appointment, status }) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                status={status}
                staffNames={staffNames}
                onEdit={handleEdit}
                onCancel={setCanceling}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Floating create button (sits above the bottom nav) */}
      {isWithinHorizon(day) && visible.length > 0 && (
        <button
          onClick={openCreate}
          aria-label="Novo agendamento"
          title="Novo agendamento"
          className="fab fixed bottom-24 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-fg shadow-float active:scale-95"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      <AppointmentForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        appointment={editing}
        defaultDate={day}
      />

      <CancelModal appointment={canceling} onClose={() => setCanceling(null)} />
    </div>
  );
}
