import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, KeyRound, ShieldAlert, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { ThemeToggle } from "@/components/ThemeToggle";
import { activateAccount } from "./hooks";
import { friendlyError } from "@/lib/cn";

const MIN_PASSWORD = 8;

export function ActivatePage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD;
  const mismatch = confirm.length > 0 && confirm !== password;
  const valid = password.length >= MIN_PASSWORD && confirm === password;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    try {
      await activateAccount(token, password);
      setDone(true);
      toast.success("Conta ativada com sucesso! 🎉");
      setTimeout(() => navigate("/login", { replace: true }), 2200);
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col justify-center bg-bg px-5 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto w-full max-w-sm"
      >
        {!token ? (
          <div className="card flex flex-col items-center p-8 text-center">
            <ShieldAlert className="mb-4 h-12 w-12 text-danger" />
            <h1 className="text-lg font-semibold text-text">Link inválido</h1>
            <p className="mt-2 text-sm text-muted">
              Este link de ativação está incompleto. Peça um novo à administradora.
            </p>
            <Link to="/login" className="mt-6">
              <Button variant="secondary">Ir para o login</Button>
            </Link>
          </div>
        ) : done ? (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="card flex flex-col items-center p-8 text-center"
          >
            <CheckCircle2 className="mb-4 h-14 w-14 text-success" />
            <h1 className="text-lg font-semibold text-text">Tudo pronto!</h1>
            <p className="mt-2 text-sm text-muted">
              Sua senha foi criada. Redirecionando para o login…
            </p>
          </motion.div>
        ) : (
          <>
            <div className="mb-8 flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-accent-fg shadow-float">
                <Sparkles className="h-8 w-8" />
              </div>
              <h1 className="text-xl font-semibold text-text">Ative sua conta</h1>
              <p className="mt-1 text-sm text-muted">
                Crie uma senha para acessar a agenda do salão.
              </p>
            </div>

            <form onSubmit={onSubmit} className="card space-y-4 p-5">
              <Input
                label="Nova senha"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<KeyRound className="h-4 w-4" />}
                autoComplete="new-password"
                error={tooShort ? `Use pelo menos ${MIN_PASSWORD} caracteres.` : undefined}
                hint={!tooShort ? `Mínimo de ${MIN_PASSWORD} caracteres.` : undefined}
                required
                disabled={submitting}
              />
              <Input
                label="Confirme a senha"
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                icon={<KeyRound className="h-4 w-4" />}
                autoComplete="new-password"
                error={mismatch ? "As senhas não coincidem." : undefined}
                required
                disabled={submitting}
              />
              <Button type="submit" fullWidth size="lg" loading={submitting} disabled={!valid}>
                Ativar conta
              </Button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
