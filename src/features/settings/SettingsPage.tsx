import { motion } from "framer-motion";
import {
  Bell,
  BellOff,
  Download,
  LogOut,
  Moon,
  Share,
  Smartphone,
  Sun,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Feedback";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { useInstallState } from "@/hooks/useInstallPrompt";
import { usePushSetup } from "@/features/reminders/usePushSetup";
import { useLogout } from "@/features/auth/hooks";
import { formatBRPhone } from "@/lib/whatsapp";
import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/cn";

function Row({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-accent">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text">{title}</p>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      className={cn(
        "relative h-7 w-12 rounded-full transition disabled:opacity-50",
        checked ? "bg-accent" : "bg-border",
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className={cn(
          "absolute top-1 h-5 w-5 rounded-full bg-white shadow",
          checked ? "left-6" : "left-1",
        )}
      />
    </button>
  );
}

export function SettingsPage() {
  const profile = useAuthStore((s) => s.profile);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const push = usePushSetup();
  const install = useInstallState();
  const logout = useLogout();

  return (
    <div className="space-y-4">
      {/* Profile */}
      <div className="card flex items-center gap-3 p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-lg font-semibold uppercase text-accent-fg">
          {profile?.full_name.slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-text">{profile?.full_name}</p>
          <p className="truncate text-xs text-muted">
            @{profile?.username} · {formatBRPhone(profile?.phone)}
          </p>
        </div>
        {isAdmin && <Badge tone="accent">Administradora</Badge>}
      </div>

      {/* Preferences */}
      <div className="card divide-y divide-border overflow-hidden">
        <Row
          icon={theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          title="Tema escuro"
          description={theme === "dark" ? "Ativado" : "Desativado"}
          action={<Toggle checked={theme === "dark"} onChange={toggleTheme} label="Tema escuro" />}
        />

        <Row
          icon={push.enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          title="Lembretes de atendimento"
          description={
            !push.supported
              ? "Não suportado neste navegador."
              : push.requiresInstall
                ? "Instale o app na Tela de Início para ativar."
                : push.permission === "denied"
                  ? "Bloqueado nas configurações do navegador."
                  : "Aviso 20 minutos antes de cada atendimento."
          }
          action={
            <Toggle
              checked={push.enabled}
              onChange={() => void push.toggle()}
              disabled={
                !push.supported ||
                push.busy ||
                push.requiresInstall ||
                push.permission === "denied"
              }
              label="Lembretes"
            />
          }
        />
      </div>

      {/* Install */}
      {!install.installed && (
        <div className="card overflow-hidden">
          {install.needsIOSInstructions ? (
            <div className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-accent" />
                <p className="text-sm font-medium text-text">Instalar no iPhone</p>
              </div>
              <ol className="ml-1 space-y-1.5 text-xs text-muted">
                <li className="flex gap-2">
                  <span className="font-semibold text-accent">1.</span>
                  <span className="flex flex-wrap items-center gap-1">
                    Toque em <Share className="inline h-3.5 w-3.5" /> <strong>Compartilhar</strong>
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-accent">2.</span>
                  <span>
                    Escolha <strong>Adicionar à Tela de Início</strong>
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-accent">3.</span>
                  <span>Abra o app pelo ícone e ative os lembretes aqui</span>
                </li>
              </ol>
            </div>
          ) : install.canPrompt ? (
            <Row
              icon={<Download className="h-4 w-4" />}
              title="Instalar aplicativo"
              description="Acesso rápido e lembretes confiáveis."
              action={
                <Button size="sm" onClick={() => void install.promptInstall()}>
                  Instalar
                </Button>
              }
            />
          ) : (
            <Row
              icon={<Smartphone className="h-4 w-4" />}
              title="Instalar aplicativo"
              description="Use o menu do navegador para adicionar à tela inicial."
              action={<span />}
            />
          )}
        </div>
      )}

      {/* Account */}
      <div className="card overflow-hidden">
        <Row
          icon={<UserRound className="h-4 w-4" />}
          title="Sessão"
          description="Você permanece conectada por 7 dias."
          action={<span />}
        />
      </div>

      <Button variant="secondary" fullWidth onClick={() => void logout()}>
        <LogOut className="h-4 w-4" />
        Sair da conta
      </Button>

      <p className="pb-4 text-center text-[11px] text-muted">{BRAND_NAME} · Agenda interna</p>
    </div>
  );
}
