import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, KeyRound, Scissors, User } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { HairstyleMark } from "@/components/HairstyleMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuthStore } from "@/stores/authStore";
import { useLogin } from "./hooks";
import { friendlyError } from "@/lib/cn";

export function LoginPage() {
  const session = useAuthStore((s) => s.session);
  const ready = useAuthStore((s) => s.ready);
  const login = useLogin();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (ready && session) return <Navigate to="/" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!username.trim() || !password) return;
    setSubmitting(true);
    try {
      await login(username, password);
      toast.success("Bem-vinda de volta! ✨");
    } catch (error) {
      toast.error(friendlyError(error));
      setSubmitting(false);
    }
    // On success the auth listener swaps the route; keep the button disabled.
  }

  return (
    <div className="relative flex min-h-dvh flex-col justify-center bg-bg px-5 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      {/* Soft salon-toned glow behind the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 0%, rgb(var(--accent-2)) 0%, transparent 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative mx-auto w-full max-w-sm"
      >
        <div className="mb-7 flex flex-col items-center text-center">
          <HairstyleMark />
          <h1 className="mt-1 text-xl font-semibold text-text">Esabel Santos Beleza</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            <Scissors className="h-3.5 w-3.5 text-accent" />
            Agenda interna da equipe
          </p>
        </div>

        <form onSubmit={onSubmit} className="card space-y-4 p-5">
          <Input
            label="Usuário"
            placeholder="seu.usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            icon={<User className="h-4 w-4" />}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="username"
            spellCheck={false}
            required
            disabled={submitting}
          />

          <div className="relative">
            <Input
              label="Senha"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<KeyRound className="h-4 w-4" />}
              autoComplete="current-password"
              required
              disabled={submitting}
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              className="absolute right-2 top-[30px] rounded-lg p-2 text-muted transition hover:text-text"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <Button type="submit" fullWidth size="lg" loading={submitting}>
            Entrar
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted">
          Esqueceu a senha? Fale com a administradora.
        </p>
      </motion.div>
    </div>
  );
}
