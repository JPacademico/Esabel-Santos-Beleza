import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Info, MessageCircle } from "lucide-react";
import { toast } from "@/lib/toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { cancellationMessage, hasWhatsApp, openWhatsApp, waLink } from "@/lib/whatsapp";
import { formatServices } from "@/lib/services";
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
 * Cancellation is a quick action, not a form: the reason is optional (a
 * one-tap "quick cancel" is the requested, supported path), then the modal
 * offers to tell the client.
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

  // Reset per appointment id, not per object identity — a refetch that hands us
  // an equivalent-but-new object must not clear a half-typed reason.
  const seededFor = useRef<string | null>(null);

  useEffect(() => {
    if (!appointment) {
      seededFor.current = null;
      return;
    }
    if (seededFor.current === appointment.id) return;
    seededFor.current = appointment.id;
    setReason("");
    setResult(null);
  }, [appointment]);

  // Optional by design — a quick cancel with nothing typed is a normal,
  // supported call, not an incomplete one.
  const trimmed = reason.trim();

  async function onConfirm() {
    if (!appointment) return;
    try {
      await cancelMutation.mutateAsync({
        id: appointment.id,
        reason: trimmed || undefined,
      });

      // No usable number → the cancellation still stands, we just can't notify.
      const canMessage = hasWhatsApp(appointment.client_phone);
      if (!canMessage) {
        setResult({ link: null, autoOpened: false });
        toast.success("Agendamento cancelado.");
        return;
      }

      const message = cancellationMessage({
        clientName: appointment.client_name,
        service: formatServices(appointment),
        scheduledAt: appointment.scheduled_at,
        reason: trimmed || undefined,
      });

      setResult({
        link: waLink(appointment.client_phone, message),
        autoOpened: openWhatsApp(appointment.client_phone, message),
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
      title={result ? (result.link ? "Avisar a cliente" : "Cancelado") : "Cancelar agendamento"}
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
              {result.link
                ? "Agendamento cancelado. Agora avise a cliente."
                : "Agendamento cancelado."}
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
              Este agendamento não tem telefone, então nenhum aviso foi enviado. Se quiser avisar
              pelo WhatsApp, adicione o número editando o agendamento.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-3 rounded-lg border border-border bg-surface-2 p-3">
            <Info className="h-5 w-5 shrink-0 text-muted" />
            <p className="text-sm text-text">
              Cancelamento rápido — o motivo é opcional.
              {appointment && hasWhatsApp(appointment.client_phone) ? (
                <> Se preencher, ele é incluído na mensagem enviada à cliente.</>
              ) : (
                <>
                  {" "}
                  Este agendamento não tem telefone, então{" "}
                  <strong>nenhum aviso será enviado</strong>.
                </>
              )}
            </p>
          </div>

          <div>
            <p className="label">Motivos rápidos</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_REASONS.map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => setReason(reason === quick ? "" : quick)}
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
            label="Motivo (opcional)"
            placeholder="Descreva o motivo, se quiser…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={200}
            hint={`${reason.length}/200`}
            disabled={cancelMutation.isPending}
          />
        </div>
      )}
    </Modal>
  );
}
