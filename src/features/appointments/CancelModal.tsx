import { useEffect, useState } from "react";
import { AlertTriangle, MessageCircle } from "lucide-react";
import { toast } from "@/lib/toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { cancellationMessage, openWhatsApp } from "@/lib/whatsapp";
import { formatFullPtBR } from "@/lib/dates";
import { friendlyError } from "@/lib/cn";
import { useCancelAppointment } from "./hooks";
import type { AppointmentWithEmployee } from "@/types/domain";

const QUICK_REASONS = [
  "Imprevisto da profissional",
  "Solicitação da cliente",
  "Reagendamento",
  "Problema de saúde",
];

interface Props {
  appointment: AppointmentWithEmployee | null;
  onClose: () => void;
}

/**
 * Cancellation is a two-part commitment: persist the reason, then hand the
 * client a pre-written WhatsApp notice. The reason is mandatory — the DB has a
 * matching check constraint.
 */
export function CancelModal({ appointment, onClose }: Props) {
  const [reason, setReason] = useState("");
  const cancelMutation = useCancelAppointment();

  useEffect(() => {
    if (appointment) setReason("");
  }, [appointment]);

  const trimmed = reason.trim();
  const valid = trimmed.length >= 3;

  async function onConfirm() {
    if (!appointment || !valid) return;
    try {
      await cancelMutation.mutateAsync({ id: appointment.id, reason: trimmed });

      const opened = openWhatsApp(
        appointment.client_phone,
        cancellationMessage({
          clientName: appointment.client_name,
          service: appointment.service_name,
          scheduledAt: appointment.scheduled_at,
          reason: trimmed,
        }),
      );

      toast.success(
        opened
          ? "Agendamento cancelado. Aviso aberto no WhatsApp."
          : "Agendamento cancelado. Cliente sem telefone cadastrado.",
      );
      onClose();
    } catch (error) {
      toast.error(friendlyError(error));
    }
  }

  return (
    <Modal
      open={appointment !== null}
      onClose={onClose}
      title="Cancelar agendamento"
      description={
        appointment
          ? `${appointment.client_name} · ${formatFullPtBR(appointment.scheduled_at)}`
          : undefined
      }
      dismissible={!cancelMutation.isPending}
      footer={
        <div className="flex gap-2">
          <Button
            variant="secondary"
            fullWidth
            onClick={onClose}
            disabled={cancelMutation.isPending}
          >
            Voltar
          </Button>
          <Button
            variant="danger"
            fullWidth
            onClick={() => void onConfirm()}
            loading={cancelMutation.isPending}
            disabled={!valid}
          >
            Confirmar
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-3 rounded-lg border border-warning/25 bg-warning/10 p-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
          <p className="text-sm text-text">
            O motivo é <strong>obrigatório</strong> e será enviado à cliente na mensagem de
            cancelamento.
          </p>
        </div>

        <div>
          <p className="label">Motivos rápidos</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_REASONS.map((quick) => (
              <button
                key={quick}
                type="button"
                onClick={() => setReason(quick)}
                className={
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition " +
                  (reason === quick
                    ? "border-accent bg-accent/12 text-accent"
                    : "border-border text-muted hover:border-accent/40 hover:text-text")
                }
              >
                {quick}
              </button>
            ))}
          </div>
        </div>

        <Textarea
          label="Motivo do cancelamento"
          placeholder="Descreva o motivo…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={200}
          required
          hint={`${reason.length}/200`}
          error={reason.length > 0 && !valid ? "Descreva o motivo com ao menos 3 caracteres." : undefined}
          disabled={cancelMutation.isPending}
        />

        {appointment?.client_phone ? (
          <p className="flex items-start gap-2 text-xs text-muted">
            <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
            Ao confirmar, o WhatsApp abrirá com o aviso já escrito para a cliente.
          </p>
        ) : (
          <p className="text-xs text-muted">
            Esta cliente não tem telefone cadastrado — nenhuma mensagem será aberta.
          </p>
        )}
      </div>
    </Modal>
  );
}
