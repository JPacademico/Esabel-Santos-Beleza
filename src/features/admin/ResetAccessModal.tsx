import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { friendlyError } from "@/lib/cn";
import { AccessLinkPanel } from "./AccessLinkResult";
import { useResetEmployeeAccess } from "./hooks";
import type { AccessLinkResult, Profile } from "@/types/domain";

interface Props {
  employee: Profile | null;
  onClose: () => void;
}

/**
 * Admin flow for "esqueci minha senha" — there is no email-based recovery
 * because accounts use non-deliverable synthetic addresses.
 */
export function ResetAccessModal({ employee, onClose }: Props) {
  const resetMutation = useResetEmployeeAccess();
  const [result, setResult] = useState<AccessLinkResult | null>(null);

  useEffect(() => {
    if (employee) setResult(null);
  }, [employee]);

  async function generate() {
    if (!employee) return;
    try {
      setResult(await resetMutation.mutateAsync(employee.id));
      toast.success("Novo link gerado.");
    } catch (error) {
      toast.error(friendlyError(error));
    }
  }

  const neverActivated = employee?.status === "pending";

  return (
    <Modal
      open={employee !== null}
      onClose={onClose}
      title={result ? "Enviar novo acesso" : "Reenviar acesso"}
      description={employee?.full_name}
      dismissible={!resetMutation.isPending}
      footer={
        result ? (
          <Button fullWidth onClick={onClose}>
            Concluir
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={onClose}
              disabled={resetMutation.isPending}
            >
              Cancelar
            </Button>
            <Button fullWidth onClick={() => void generate()} loading={resetMutation.isPending}>
              Gerar link
            </Button>
          </div>
        )
      }
    >
      {result ? (
        <AccessLinkPanel
          result={result}
          note="O link vale por 72 horas e só pode ser usado uma vez. Links enviados anteriormente deixaram de funcionar."
        />
      ) : (
        <div className="space-y-4">
          <div className="flex gap-3 rounded-lg border border-accent/25 bg-accent/10 p-3">
            <KeyRound className="h-5 w-5 shrink-0 text-accent" />
            <p className="text-sm text-text">
              {neverActivated
                ? "Esta conta ainda não foi ativada. Gere um novo link para ela criar a senha."
                : "Gere um link para ela cadastrar uma nova senha."}
            </p>
          </div>

          <ul className="space-y-1.5 text-xs text-muted">
            <li>• Qualquer link enviado antes deixará de funcionar.</li>
            {!neverActivated && <li>• A senha atual continua valendo até ela criar a nova.</li>}
            <li>• O novo link expira em 72 horas.</li>
          </ul>
        </div>
      )}
    </Modal>
  );
}
