import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Cake, MessageCircle, Pencil, Phone, Plus, Search, Trash2, Users } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { EmptyState, Skeleton } from "@/components/ui/Feedback";
import { useAuthStore } from "@/stores/authStore";
import { formatBRPhone, openWhatsApp } from "@/lib/whatsapp";
import { friendlyError } from "@/lib/cn";
import { ClientForm } from "./ClientForm";
import { useClients, useDeleteClient } from "./hooks";
import type { Client } from "@/types/domain";

export function ClientsPage() {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);

  const { data: clients, isLoading } = useClients(search);
  const deleteMutation = useDeleteClient();

  async function handleDelete(client: Client) {
    if (!window.confirm(`Excluir ${client.full_name} do cadastro?`)) return;
    try {
      await deleteMutation.mutateAsync(client.id);
      toast.success("Cliente excluída.");
    } catch (error) {
      toast.error(friendlyError(error));
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <div className="flex-1">
          <Input
            placeholder="Buscar cliente…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4" />}
            autoCapitalize="words"
          />
        </div>
        <Button
          size="icon"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          aria-label="Nova cliente"
          className="mt-0 h-11 w-11 shrink-0"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px]" />
          ))}
        </div>
      ) : (clients?.length ?? 0) === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title={search ? "Nenhuma cliente encontrada" : "Nenhuma cliente cadastrada"}
          description={
            search
              ? "Tente outro nome."
              : "Cadastre as clientes frequentes para agilizar os agendamentos."
          }
          action={
            !search ? (
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Nova cliente
              </Button>
            ) : undefined
          }
        />
      ) : (
        <motion.div layout className="space-y-2">
          <AnimatePresence mode="popLayout">
            {clients?.map((client) => (
              <motion.div
                key={client.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="card flex items-center gap-3 p-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/12 text-sm font-semibold uppercase text-accent">
                  {client.full_name.slice(0, 2)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">{client.full_name}</p>
                  <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {formatBRPhone(client.phone)}
                    </span>
                    {client.birthday && (
                      <span className="flex items-center gap-1">
                        <Cake className="h-3 w-3" />
                        {format(parseISO(client.birthday), "d 'de' MMM", { locale: ptBR })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  {client.phone && (
                    <button
                      onClick={() =>
                        openWhatsApp(
                          client.phone,
                          `Olá ${client.full_name.split(" ")[0]}! 💇‍♀️ Aqui é do *Esabel Santos Beleza*.`,
                        )
                      }
                      aria-label="Abrir WhatsApp"
                      className="rounded-lg p-2 text-success transition hover:bg-success/10"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEditing(client);
                      setFormOpen(true);
                    }}
                    aria-label="Editar"
                    className="rounded-lg p-2 text-muted transition hover:bg-surface-2 hover:text-text"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => void handleDelete(client)}
                      aria-label="Excluir"
                      className="rounded-lg p-2 text-muted transition hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <ClientForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        client={editing}
      />
    </div>
  );
}
