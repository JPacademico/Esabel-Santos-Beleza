import { memo } from "react";
import { motion } from "framer-motion";
import { Ban, Clock, MessageCircle, Pencil, Phone, Scissors, Trash2, UserRound } from "lucide-react";
import { StatusBadge } from "@/components/ui/Feedback";
import type { DisplayStatus } from "@/lib/status";
import { formatTime } from "@/lib/dates";
import { formatBRPhone, openWhatsApp } from "@/lib/whatsapp";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/stores/authStore";
import type { AppointmentWithEmployee } from "@/types/domain";

interface Props {
  appointment: AppointmentWithEmployee;
  /**
   * Computed by the parent rather than derived from a `now` prop: passing the
   * clock would re-render every card each minute, whereas the status string
   * only changes when an appointment actually becomes "Concluído".
   */
  status: DisplayStatus;
  onEdit: (appointment: AppointmentWithEmployee) => void;
  onCancel: (appointment: AppointmentWithEmployee) => void;
  onDelete: (appointment: AppointmentWithEmployee) => void;
}

function AppointmentCardBase({ appointment, status, onEdit, onCancel, onDelete }: Props) {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const userId = useAuthStore((s) => s.session?.user.id);

  // Mirrors the RLS mutation rule: own rows, or admin for any.
  const canMutate = isAdmin || appointment.employee_id === userId;
  const isCanceled = status === "canceled";
  const isConcluded = status === "concluded";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className={cn(
        "card overflow-hidden p-4 transition",
        isCanceled && "opacity-70",
        isConcluded && "bg-surface-2/60",
      )}
    >
      <div className="flex items-start gap-3">
        {/* Time rail */}
        <div
          className={cn(
            "flex w-14 shrink-0 flex-col items-center rounded-lg py-2",
            isCanceled ? "bg-danger/10" : isConcluded ? "bg-success/10" : "bg-accent/10",
          )}
        >
          <Clock
            className={cn(
              "mb-0.5 h-3.5 w-3.5",
              isCanceled ? "text-danger" : isConcluded ? "text-success" : "text-accent",
            )}
          />
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              isCanceled ? "text-danger" : isConcluded ? "text-success" : "text-accent",
            )}
          >
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
            <StatusBadge status={status} />
          </div>

          <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted">
            <Scissors className="h-3.5 w-3.5 shrink-0" />
            {appointment.service_name}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="flex items-center gap-1">
              <UserRound className="h-3.5 w-3.5" />
              {appointment.employee?.full_name ?? "—"}
            </span>
            {appointment.client_phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {formatBRPhone(appointment.client_phone)}
              </span>
            )}
          </div>

          {isCanceled && appointment.cancellation_reason && (
            <p className="mt-2 rounded-lg bg-danger/8 px-2.5 py-1.5 text-xs text-danger">
              <span className="font-medium">Motivo:</span> {appointment.cancellation_reason}
            </p>
          )}

          {/* Actions */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {appointment.client_phone && (
              <button
                onClick={() =>
                  openWhatsApp(
                    appointment.client_phone,
                    `Olá ${appointment.client_name.split(" ")[0]}! 💇‍♀️ Aqui é do *Esabel Santos Beleza*.`,
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-success transition hover:bg-success/10"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
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
                <button
                  onClick={() => onCancel(appointment)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-danger transition hover:bg-danger/10"
                >
                  <Ban className="h-3.5 w-3.5" />
                  Cancelar
                </button>
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
