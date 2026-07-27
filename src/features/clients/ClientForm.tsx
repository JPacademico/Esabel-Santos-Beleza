import { useEffect, useState, type FormEvent } from "react";
import { Cake, Phone, UserRound } from "lucide-react";
import { toast } from "@/lib/toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { friendlyError } from "@/lib/cn";
import { formatBRPhone } from "@/lib/whatsapp";
import { useCreateClient, useUpdateClient } from "./hooks";
import type { Client } from "@/types/domain";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Editing an existing client, or null to create. */
  client?: Client | null;
  prefillName?: string;
  onCreated?: (client: Client) => void;
}

export function ClientForm({ open, onClose, client, prefillName, onCreated }: Props) {
  const isEdit = Boolean(client);
  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();
  const pending = createMutation.isPending || updateMutation.isPending;

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");

  useEffect(() => {
    if (!open) return;
    setFullName(client?.full_name ?? prefillName ?? "");
    setPhone(client?.phone ? formatBRPhone(client.phone) : "");
    setBirthday(client?.birthday ?? "");
  }, [open, client, prefillName]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!fullName.trim()) return;

    const input = {
      full_name: fullName,
      phone: phone.trim() || null,
      birthday: birthday || null,
    };

    try {
      if (isEdit && client) {
        await updateMutation.mutateAsync({ id: client.id, input });
        toast.success("Cliente atualizada.");
      } else {
        const created = await createMutation.mutateAsync(input);
        toast.success("Cliente cadastrada! 💖");
        onCreated?.(created);
      }
      onClose();
    } catch (error) {
      toast.error(friendlyError(error));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar cliente" : "Nova cliente"}
      description={isEdit ? undefined : "Cadastre para agilizar os próximos agendamentos."}
      dismissible={!pending}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" fullWidth onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button
            fullWidth
            onClick={(e) => void onSubmit(e as unknown as FormEvent)}
            loading={pending}
            disabled={!fullName.trim()}
          >
            {isEdit ? "Salvar" : "Cadastrar"}
          </Button>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Nome completo"
          placeholder="Maria Silva"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          icon={<UserRound className="h-4 w-4" />}
          required
          disabled={pending}
        />
        <Input
          label="WhatsApp"
          type="tel"
          inputMode="numeric"
          placeholder="(79) 99999-8888"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          icon={<Phone className="h-4 w-4" />}
          hint="Usado para avisos de cancelamento."
          disabled={pending}
        />
        <Input
          label="Aniversário"
          type="date"
          value={birthday}
          onChange={(e) => setBirthday(e.target.value)}
          icon={<Cake className="h-4 w-4" />}
          hint="Opcional — para promoções futuras."
          disabled={pending}
        />
        {/* Enables Enter-to-submit inside the modal. */}
        <button type="submit" className="hidden" aria-hidden />
      </form>
    </Modal>
  );
}
