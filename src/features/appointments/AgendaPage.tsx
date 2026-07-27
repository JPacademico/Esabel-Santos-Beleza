import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarPlus, CalendarX2, Filter, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { AppointmentSkeleton, EmptyState } from "@/components/ui/Feedback";
import { useAuthStore } from "@/stores/authStore";
import { useNowTick } from "@/hooks/useNowTick";
import { computeAppointmentStatus } from "@/lib/status";
import { fromDateParam, isWithinHorizon, startOfMonth, toDateParam } from "@/lib/dates";
import { friendlyError, cn } from "@/lib/cn";
import { DayPager } from "./DayPager";
import { MonthGrid } from "./MonthGrid";
import { AppointmentCard } from "./AppointmentCard";
import { AppointmentForm } from "./AppointmentForm";
import { CancelModal } from "./CancelModal";
import { useAppointmentsByDay, useDeleteAppointment } from "./hooks";
import type { AppointmentWithEmployee } from "@/types/domain";

type Scope = "all" | "mine";

export function AgendaPage() {
  const { date } = useParams<{ date?: string }>();
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.session?.user.id);

  // The visible day comes from the URL so it survives refresh and deep links.
  const day = fromDateParam(date);
  const now = useNowTick(60_000); // re-derives "Concluído" as time passes

  const [showMonth, setShowMonth] = useState(false);
  const [month, setMonth] = useState(() => startOfMonth(day));
  const [scope, setScope] = useState<Scope>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentWithEmployee | null>(null);
  const [canceling, setCanceling] = useState<AppointmentWithEmployee | null>(null);

  const { data: appointments, isLoading, isError, error } = useAppointmentsByDay(day);
  const deleteMutation = useDeleteAppointment();

  const visible = useMemo(() => {
    const list = appointments ?? [];
    return scope === "mine" ? list.filter((a) => a.employee_id === userId) : list;
  }, [appointments, scope, userId]);

  const summary = useMemo(() => {
    const counts = { scheduled: 0, concluded: 0, canceled: 0 };
    for (const appointment of visible) counts[computeAppointmentStatus(appointment, now)]++;
    return counts;
  }, [visible, now]);

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

  async function handleDelete(appointment: AppointmentWithEmployee) {
    if (!window.confirm(`Excluir definitivamente o agendamento de ${appointment.client_name}?`)) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(appointment.id);
      toast.success("Agendamento excluído.");
    } catch (err) {
      toast.error(friendlyError(err));
    }
  }

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

      {/* Day summary + scope filter */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <span className="font-medium text-text">{visible.length}</span>
          <span>{visible.length === 1 ? "agendamento" : "agendamentos"}</span>
          {summary.concluded > 0 && <span className="text-success">· {summary.concluded} concluído(s)</span>}
          {summary.canceled > 0 && <span className="text-danger">· {summary.canceled} cancelado(s)</span>}
        </div>

        <button
          onClick={() => setScope((s) => (s === "all" ? "mine" : "all"))}
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
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Novo agendamento
              </Button>
            ) : undefined
          }
        />
      ) : (
        <motion.div layout className="space-y-3">
          <AnimatePresence mode="popLayout">
            {visible.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                now={now}
                onEdit={(a) => {
                  setEditing(a);
                  setFormOpen(true);
                }}
                onCancel={setCanceling}
                onDelete={(a) => void handleDelete(a)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Floating create button (sits above the bottom nav) */}
      {isWithinHorizon(day) && visible.length > 0 && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 25 }}
          onClick={openCreate}
          aria-label="Novo agendamento"
          className="fixed bottom-24 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-fg shadow-float transition active:scale-95"
        >
          <Plus className="h-6 w-6" />
        </motion.button>
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
