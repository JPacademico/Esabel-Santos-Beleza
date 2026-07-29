import { memo } from "react";
import { motion } from "framer-motion";
import {
  Ban,
  CheckCircle2,
  Clock,
  MessageCircle,
  Pencil,
  Phone,
  RotateCcw,
  Scissors,
  Trash2,
  UserRound,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/Feedback";
import type { DisplayStatus } from "@/lib/status";
import { formatTime } from "@/lib/dates";
import { formatBRPhone, greeting, hasWhatsApp, openWhatsApp } from "@/lib/whatsapp";
import { appointmentServices, isAssignedTo, serviceAssignments } from "@/lib/services";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/stores/authStore";
import type { AppointmentWithEmployee } from "@/types/domain";

interface Props {
  appointment: AppointmentWithEmployee;
  status: DisplayStatus;
  /**
   * Still scheduled, but the booked time has passed — waiting to be confirmed
   * or cancelled. Derived by the parent rather than from a `now` prop here, so
   * the minute tick re-renders one component instead of every card.
   */
  awaiting: boolean;
  /**
   * id → name for every professional. Only consulted when an appointment is
   * split across staff; the common single-professional case reads the joined
   * `employee` on the row itself.
   */
  staffNames?: Map<string, string>;
  onEdit: (appointment: AppointmentWithEmployee) => void;
  onCancel: (appointment: AppointmentWithEmployee) => void;
  onDelete: (appointment: AppointmentWithEmployee) => void;
  onConclude: (appointment: AppointmentWithEmployee) => void;
  onReopen: (appointment: AppointmentWithEmployee) => void;
  /** Disables the completion actions while one is in flight. */
  busy?: boolean;
}

/** Short label for a chip — full names make the chips wrap on a phone. */
function firstNameOf(fullName: string | undefined): string {
  if (!fullName) return "—";
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function AppointmentCardBase({
  appointment,
  status,
  awaiting,
  staffNames,
  onEdit,
  onCancel,
  onDelete,
  onConclude,
  onReopen,
  busy,
}: Props) {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const userId = useAuthStore((s) => s.session?.user.id);

  // Mirrors the RLS mutation rule: admin, or anyone assigned to any of the
  // services. Same predicate the agenda's "Só os meus" filter uses, so the
  // list you see and the rows you can act on can never disagree.
  const canMutate = isAdmin || isAssignedTo(appointment, userId);
  const isCanceled = status === "canceled";
  const isConcluded = status === "concluded";

  const services = appointmentServices(appointment);
  const assignments = serviceAssignments(appointment);
  // Only worth naming a professional per service when they actually differ.
  const split = new Set(assignments).size > 1;
  // The phone is optional on an appointment, so every WhatsApp affordance is
  // gated on a usable number rather than merely a non-empty one.
  const canMessage = hasWhatsApp(appointment.client_phone);

  const railTone = isCanceled
    ? "text-danger"
    : isConcluded
      ? "text-success"
      : awaiting
        ? "text-warning"
        : "text-accent";

  return (
    <motion.article
      /*
        `layout="position"` (not full `layout`) so siblings glide up when a card
        is removed without the card's own box being scale-distorted mid-flight.

        No `initial`/`animate`: layout animations are driven THROUGH `transform`,
        so animating `y` here fought the layout engine for the same property —
        a real source of the jitter. Entrance is handled one level up by the
        container's .list-swap, which costs one animation instead of N.

        The tween replaces a spring at stiffness 320 / damping 30. Critical
        damping there is 2·√320 ≈ 35.8, so it was underdamped and visibly
        overshot — that was the bounce.
      */
      layout="position"
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.22, 0.61, 0.36, 1] }}
      className={cn(
        "card overflow-hidden p-4 transition",
        isCanceled && "opacity-70",
        isConcluded && "bg-surface-2/60",
      )}
    >
      <div className="flex items-start gap-3">
        {/* Time rail — warning tint while an appointment is awaiting confirmation. */}
        <div
          className={cn(
            "flex w-14 shrink-0 flex-col items-center rounded-lg py-2",
            isCanceled
              ? "bg-danger/10"
              : isConcluded
                ? "bg-success/10"
                : awaiting
                  ? "bg-warning/10"
                  : "bg-accent/10",
          )}
        >
          <Clock className={cn("mb-0.5 h-3.5 w-3.5", railTone)} />
          <span className={cn("text-sm font-semibold tabular-nums", railTone)}>
            {formatTime(appointment.scheduled_at)}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={cn(
                "truncate font-semibold text-text",
                isCanceled && "line-through decoration-danger/60",
              )}
            >
              {appointment.client_name}
            </h3>
            <StatusBadge status={status} awaiting={awaiting} />
          </div>

          {/*
            One chip per service — a booking is often a combination. When the
            appointment is split across professionals each chip also names its
            own, since "who does what" is the whole point of splitting it.
          */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <Scissors className="mr-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
            {services.map((service, index) => (
              <span
                key={service}
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  isCanceled
                    ? "bg-surface-2 text-muted line-through"
                    : isConcluded
                      ? "bg-success/10 text-success"
                      : "bg-accent/10 text-accent",
                )}
              >
                {service}
                {split && (
                  <span className="opacity-70">
                    {" · "}
                    {firstNameOf(staffNames?.get(assignments[index]))}
                  </span>
                )}
              </span>
            ))}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="flex items-center gap-1">
              <UserRound className="h-3.5 w-3.5" />
              {split
                ? [...new Set(assignments)]
                    .map((id) => firstNameOf(staffNames?.get(id)))
                    .join(" e ")
                : (appointment.employee?.full_name ?? "—")}
            </span>
            <span className="flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" />
              {canMessage ? formatBRPhone(appointment.client_phone) : "Sem telefone"}
            </span>
          </div>

          {isCanceled && appointment.cancellation_reason && (
            <p className="mt-2 rounded-lg bg-danger/8 px-2.5 py-1.5 text-xs text-danger">
              <span className="font-medium">Motivo:</span> {appointment.cancellation_reason}
            </p>
          )}

          {/* Actions */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {/*
              Shown but disabled without a number, rather than hidden: the
              absence is information ("add her number to enable this"), and a
              button that silently disappears reads as a bug.
            */}
            <button
              disabled={!canMessage}
              title={
                canMessage
                  ? undefined
                  : "Sem telefone cadastrado. Edite o agendamento para adicionar."
              }
              onClick={() =>
                openWhatsApp(appointment.client_phone, greeting(appointment.client_name))
              }
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition",
                canMessage
                  ? "text-success hover:bg-success/10"
                  : "cursor-not-allowed text-muted opacity-50",
              )}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </button>

            {/*
              "Concluir" only appears once the booked time has passed, matching
              the DB rule that nothing can be finished before it starts. Cancel
              stays available on a past appointment on purpose — a client who
              cancels late is precisely the case the old time-based rule got
              wrong.
            */}
            {canMutate && awaiting && (
              <button
                onClick={() => onConclude(appointment)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-success transition hover:bg-success/10 disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Concluir
              </button>
            )}

            {canMutate && isConcluded && (
              <button
                onClick={() => onReopen(appointment)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-surface-2 hover:text-text disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reabrir
              </button>
            )}

            {canMutate && !isCanceled && (
              <>
                <button
                  onClick={() => onEdit(appointment)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-surface-2 hover:text-text"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
                {!isConcluded && (
                  <button
                    onClick={() => onCancel(appointment)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-danger transition hover:bg-danger/10"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Cancelar
                  </button>
                )}
              </>
            )}

            {canMutate && isCanceled && (
              <button
                onClick={() => onDelete(appointment)}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted transition hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

/**
 * Memoised: with stable callbacks from the parent, a day's worth of cards
 * re-render only when their own data or status changes — not on every
 * clock tick or sibling update.
 */
export const AppointmentCard = memo(AppointmentCardBase);
