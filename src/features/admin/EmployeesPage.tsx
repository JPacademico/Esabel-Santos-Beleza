import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, KeyRound, Plus, ShieldCheck, UserMinus, UsersRound } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { Badge, EmptyState, Skeleton } from "@/components/ui/Feedback";
import { Modal } from "@/components/ui/Modal";
import { formatBRPhone } from "@/lib/whatsapp";
import { friendlyError } from "@/lib/cn";
import { useAuthStore } from "@/stores/authStore";
import { CreateEmployeeForm } from "./CreateEmployeeForm";
import { ResetAccessModal } from "./ResetAccessModal";
import { useDeleteEmployee, useEmployees } from "./hooks";
import type { AccountStatus, Profile } from "@/types/domain";

const STATUS_META: Record<AccountStatus, { label: string; tone: "success" | "warning" | "neutral" }> = {
  active: { label: "Ativa", tone: "success" },
  pending: { label: "Pendente", tone: "warning" },
  inactive: { label: "Desativada", tone: "neutral" },
};

export function EmployeesPage() {
  const currentUserId = useAuthStore((s) => s.session?.user.id);
  const { data: employees, isLoading } = useEmployees();
  const deleteMutation = useDeleteEmployee();

  const [createOpen, setCreateOpen] = useState(false);
  const [resetting, setResetting] = useState<Profile | null>(null);
  const [removing, setRemoving] = useState<Profile | null>(null);
  const [reassignTo, setReassignTo] = useState("");

  const activeOthers = (employees ?? []).filter(
    (e) => e.status === "active" && e.id !== removing?.id,
  );

  async function confirmRemove() {
    if (!removing) return;
    try {
      await deleteMutation.mutateAsync({
        user_id: removing.id,
        reassign_to: reassignTo || undefined,
      });
      toast.success(
        reassignTo
          ? "Funcionária desativada e agendamentos futuros transferidos."
          : "Funcionária desativada.",
      );
      setRemoving(null);
      setReassignTo("");
    } catch (error) {
      toast.error(friendlyError(error));
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-base font-semibold text-text">Equipe</h1>
          <p className="text-xs text-muted">
            {employees?.length ?? 0} {employees?.length === 1 ? "pessoa" : "pessoas"}
          </p>
        </div>
        <Button pulse onClick={() => setCreateOpen(true)} title="Nova funcionária">
          <Plus className="h-4 w-4" />
          Nova
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px]" />
          ))}
        </div>
      ) : (employees?.length ?? 0) === 0 ? (
        <EmptyState
          icon={<UsersRound className="h-8 w-8" />}
          title="Nenhuma funcionária"
          description="Crie a primeira conta para a equipe."
          action={
            <Button pulse onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Nova funcionária
            </Button>
          }
        />
      ) : (
        <motion.div layout className="space-y-2">
          <AnimatePresence mode="popLayout">
            {employees?.map((employee) => {
              const isAdmin = employee.role === "super_admin";
              const isSelf = employee.id === currentUserId;
              const meta = STATUS_META[employee.status];

              return (
                <motion.div
                  key={employee.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="card flex items-center gap-3 p-3"
                >
                  <div
                    className={
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold uppercase " +
                      (isAdmin ? "bg-accent text-accent-fg" : "bg-accent/12 text-accent")
                    }
                  >
                    {isAdmin ? <Crown className="h-4 w-4" /> : employee.full_name.slice(0, 2)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium text-text">
                      {employee.full_name}
                      {isSelf && <span className="text-xs font-normal text-muted">(você)</span>}
                    </p>
                    <p className="truncate text-xs text-muted">
                      @{employee.username} · {formatBRPhone(employee.phone)}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <Badge tone={isAdmin ? "accent" : meta.tone}>
                      {isAdmin ? (
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          Admin
                        </span>
                      ) : (
                        meta.label
                      )}
                    </Badge>

                    {/* Re-issues an access link: covers both "never activated"
                        and "forgot password" — there is no email recovery. */}
                    {!isAdmin && employee.status !== "inactive" && (
                      <button
                        onClick={() => setResetting(employee)}
                        aria-label="Reenviar acesso"
                        title="Reenviar acesso"
                        className="rounded-lg p-2 text-muted transition hover:bg-accent/10 hover:text-accent"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                    )}

                    {!isAdmin && employee.status !== "inactive" && (
                      <button
                        onClick={() => {
                          setRemoving(employee);
                          setReassignTo("");
                        }}
                        aria-label="Desativar"
                        className="rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger"
                      >
                        <UserMinus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      <CreateEmployeeForm open={createOpen} onClose={() => setCreateOpen(false)} />

      <ResetAccessModal employee={resetting} onClose={() => setResetting(null)} />

      <Modal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title="Desativar funcionária"
        description={removing?.full_name}
        dismissible={!deleteMutation.isPending}
        footer={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setRemoving(null)}
              disabled={deleteMutation.isPending}
            >
              Voltar
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={() => void confirmRemove()}
              loading={deleteMutation.isPending}
            >
              Desativar
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-text">
            Ela perderá o acesso imediatamente. O histórico de atendimentos é{" "}
            <strong>preservado</strong>.
          </p>

          <Select
            label="Transferir agendamentos futuros para"
            value={reassignTo}
            onChange={(e) => setReassignTo(e.target.value)}
            hint="Opcional. Atendimentos passados continuam no nome dela."
            disabled={deleteMutation.isPending}
          >
            <option value="">Não transferir</option>
            {activeOthers.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.full_name}
              </option>
            ))}
          </Select>
        </div>
      </Modal>
    </div>
  );
}
