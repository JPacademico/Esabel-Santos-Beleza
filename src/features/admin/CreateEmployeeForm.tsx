import { useEffect, useState, type FormEvent } from "react";
import { AtSign, Check, Copy, MessageCircle, Phone, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { friendlyError } from "@/lib/cn";
import { useCreateEmployee } from "./hooks";
import type { CreateEmployeeResult } from "@/types/domain";

const USERNAME_RE = /^[a-z0-9._-]{3,30}$/;

/** Suggests a username from the person's name: "Maria Silva" → "maria.silva". */
function suggestUsername(fullName: string): string {
  return fullName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join(".");
}

export function CreateEmployeeForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createMutation = useCreateEmployee();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<CreateEmployeeResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFullName("");
    setUsername("");
    setUsernameTouched(false);
    setPhone("");
    setResult(null);
    setCopied(false);
  }, [open]);

  // Auto-fill the username until the admin edits it manually.
  useEffect(() => {
    if (!usernameTouched) setUsername(suggestUsername(fullName));
  }, [fullName, usernameTouched]);

  const usernameValid = USERNAME_RE.test(username);
  const phoneDigits = phone.replace(/\D/g, "");
  const phoneValid = phoneDigits.length >= 10;
  const valid = fullName.trim().length > 1 && usernameValid && phoneValid;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!valid) return;
    try {
      const created = await createMutation.mutateAsync({
        full_name: fullName.trim(),
        username,
        phone: phoneDigits,
      });
      setResult(created);
      toast.success("Funcionária criada! Envie o link de ativação.");
    } catch (error) {
      toast.error(friendlyError(error));
    }
  }

  async function copyLink() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.setup_url);
      setCopied(true);
      toast.success("Link copiado.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={result ? "Enviar link de ativação" : "Nova funcionária"}
      description={
        result
          ? "O link é pessoal e expira em 72 horas."
          : "Ela definirá a própria senha pelo link de ativação."
      }
      dismissible={!createMutation.isPending}
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
              disabled={createMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              fullWidth
              onClick={(e) => void onSubmit(e as unknown as FormEvent)}
              loading={createMutation.isPending}
              disabled={!valid}
            >
              Criar conta
            </Button>
          </div>
        )
      }
    >
      {result ? (
        <div className="space-y-4">
          <a
            href={result.wa_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-success px-4 py-3 font-medium text-white transition hover:brightness-95 active:scale-[0.98]"
          >
            <MessageCircle className="h-5 w-5" />
            Enviar pelo WhatsApp
          </a>

          <div>
            <p className="label">Ou copie o link</p>
            <div className="flex gap-2">
              <input readOnly value={result.setup_url} className="field flex-1 text-xs" />
              <Button variant="secondary" size="icon" onClick={() => void copyLink()} aria-label="Copiar link">
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <p className="rounded-lg bg-surface-2 p-3 text-xs text-muted">
            A conta fica <strong>pendente</strong> até ela criar a senha pelo link.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Nome completo"
            placeholder="Maria Silva"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            icon={<UserRound className="h-4 w-4" />}
            required
            disabled={createMutation.isPending}
          />
          <Input
            label="Usuário de acesso"
            placeholder="maria.silva"
            value={username}
            onChange={(e) => {
              setUsernameTouched(true);
              setUsername(e.target.value.toLowerCase());
            }}
            icon={<AtSign className="h-4 w-4" />}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            disabled={createMutation.isPending}
            error={
              username && !usernameValid
                ? "3–30 caracteres: letras minúsculas, números, ponto, hífen ou _."
                : undefined
            }
            hint={usernameValid ? "Ela usará este nome para entrar." : undefined}
          />
          <Input
            label="WhatsApp"
            type="tel"
            inputMode="numeric"
            placeholder="(79) 99999-8888"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            icon={<Phone className="h-4 w-4" />}
            required
            disabled={createMutation.isPending}
            error={phone && !phoneValid ? "Informe o número com DDD." : undefined}
            hint={phoneValid ? "O link de ativação será enviado para este número." : undefined}
          />
          <button type="submit" className="hidden" aria-hidden />
        </form>
      )}
    </Modal>
  );
}
