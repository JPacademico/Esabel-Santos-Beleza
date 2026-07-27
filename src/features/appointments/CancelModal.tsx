import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, MessageCircle } from "lucide-react";
import { toast } from "@/lib/toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { cancellationMessage, openWhatsApp, waLink } from "@/lib/whatsapp";
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

interface CancelResult {
  /** null when the client has no phone on file. */
  link: string | null;
  autoOpened: boolean;
}

/**
 * Cancellation is a two-part commitment: persist the reason, then make sure
 * the client actually gets told.
 *
 * The WhatsApp hand-off must survive iOS: a popup opened after an `await` is
 * blocked there, so we always land on a confirmation step containing a real
 * <a href> the user can tap. The automatic open is a convenience on platforms
 * that allow it — never the only route.
 */
export function CancelModal({ appointment, onClose }: Props) {
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<CancelResult | null>(null);
  const cancelMutation = useCancelAppointment();

  useEffect(() => {
    if (appointment) {
      setReason("");
      setResult(null);
    }
  }, [appointment]);

  const trimmed = reason.trim();
  const valid = trimmed.length >= 3;

  async function onConfirm() {
    if (!appointment || !valid) return;
    try {
      await cancelMutation.mutateAsync({ id: appointment.id, reason: trimmed });

      const message = cancellationMessage({
        clientName: appointment.client_name,
        service: appointment.service_name,
        scheduledAt: appointment.scheduled_at,
        reason: trimmed,
      });

      const hasPhone = Boolean(appointment.client_phone?.replace(/\D/g, ""));
      const autoOpened = hasPhone ? openWhatsApp(appointment.client_phone, message) : false;

      setResult({
        link: hasPhone ? waLink(appointment.client_phone, message) : null,
        autoOpened,
      });
      toast.success("Agendamento cancelado.");
    } catch (error) {
      toast.error(friendlyError(error));
    }
  }

  return (
    <Modal
      open={appointment !== null}
      onClose={onClose}
      title={result ? "Avisar a cliente" : "Cancelar agendamento"}
      description={
        appointment
          ? `${appointment.client_name} · ${formatFullPtBR(appointment.scheduled_at)}`
          : undefined
      }
      dismissible={!cancelMutation.isPending}
      footer={
        result ? (
          <Button fullWidth variant="secondary" onClick={onClose}>
            Concluir
          </Button>
        ) : (
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
        )
      }
    >
      {result ? (
        <div className="space-y-4">
          <div className="flex gap-3 rounded-lg border border-success/25 bg-success/10 p-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
            <p className="text-sm text-text">
              Agendamento cancelado. Agora avise a cliente.
            </p>
          </div>

          {result.link ? (
            <>
              {/*
                A plain anchor, not window.open: this is the path that works
                everywhere, including an installed iOS PWA.
              */}
              <a
                href={result.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-success px-4 py-3 font-medium text-white transition hover:brightness-95 active:scale-[0.98]"
              >
                <MessageCircle className="h-5 w-5" />
                {result.autoOpened ? "Reabrir no WhatsApp" : "Avisar no WhatsApp"}
              </a>
              <p className="text-xs text-muted">
                {result.autoOpened
                  ? "O WhatsApp foi aberto em outra aba com a mensagem pronta."
                  : "Toque no botão acima para abrir o WhatsApp com a mensagem já escrita."}
              </p>
            </>
          ) : (
            <p className="rounded-lg bg-surface-2 p-3 text-xs text-muted">
              Esta cliente não tem telefone cadastrado, então não é possível enviar o aviso
              automaticamente.
            </p>
          )}
        </div>
      ) : (
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
            error={
              reason.length > 0 && !valid ? "Descreva o motivo com ao menos 3 caracteres." : undefined
            }
            disabled={cancelMutation.isPending}
          />
        </div>
      )}
    </Modal>
  );
}
