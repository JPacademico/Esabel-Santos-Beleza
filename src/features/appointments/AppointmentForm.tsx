import { useEffect, useState, type FormEvent } from "react";
import { CalendarClock, Phone, Scissors, UserRound } from "lucide-react";
import { toast } from "@/lib/toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { ClientAutocomplete } from "@/features/clients/ClientAutocomplete";
import { ClientForm } from "@/features/clients/ClientForm";
import { useAuthStore } from "@/stores/authStore";
import { friendlyError } from "@/lib/cn";
import { formatBRPhone, normalizeBRPhone } from "@/lib/whatsapp";
import {
  canScheduleAt,
  fromDatetimeLocalValue,
  maxAheadDate,
  toDatetimeLocalValue,
} from "@/lib/dates";
import { useCreateAppointment, useEmployeeOptions, useUpdateAppointment } from "./hooks";
import type { AppointmentWithEmployee, Client } from "@/types/domain";

const SERVICE_SUGGESTIONS = [
  "Corte",
  "Escova",
  "Coloração",
  "Hidratação",
  "Progressiva",
  "Manicure",
  "Pedicure",
  "Maquiagem",
  "Sobrancelha",
];

interface Props {
  open: boolean;
  onClose: () => void;
  /** Existing appointment to edit, or null to create a new one. */
  appointment?: AppointmentWithEmployee | null;
  /** Day the agenda is currently showing — seeds the date field. */
  defaultDate: Date;
}

export function AppointmentForm({ open, onClose, appointment, defaultDate }: Props) {
  const isEdit = Boolean(appointment);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const userId = useAuthStore((s) => s.session?.user.id ?? "");

  const { data: employees } = useEmployeeOptions();
  const createMutation = useCreateAppointment();
  const updateMutation = useUpdateAppointment();
  const pending = createMutation.isPending || updateMutation.isPending;

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [prefillName, setPrefillName] = useState("");

  // Seed the form whenever it opens.
  useEffect(() => {
    if (!open) return;
    if (appointment) {
      setSelectedClient(null);
      setClientName(appointment.client_name);
      setClientPhone(appointment.client_phone ? formatBRPhone(appointment.client_phone) : "");
      setServiceName(appointment.service_name);
      setScheduledAt(toDatetimeLocalValue(new Date(appointment.scheduled_at)));
      setEmployeeId(appointment.employee_id);
    } else {
      // Default to the visible day at 09:00 (or now, if that day is today and later).
      const seed = new Date(defaultDate);
      seed.setHours(9, 0, 0, 0);
      setSelectedClient(null);
      setClientName("");
      setClientPhone("");
      setServiceName("");
      setScheduledAt(toDatetimeLocalValue(seed));
      setEmployeeId(userId);
    }
  }, [open, appointment, defaultDate, userId]);

  const parsedDate = scheduledAt ? fromDatetimeLocalValue(scheduledAt) : null;
  const dateValid = parsedDate !== null && !Number.isNaN(parsedDate.getTime());
  const beyondHorizon = dateValid && !canScheduleAt(parsedDate);
  const valid = clientName.trim() && serviceName.trim() && dateValid && !beyondHorizon && employeeId;

  function handleClientSelected(client: Client | null) {
    setSelectedClient(client);
    if (client) {
      setClientName(client.full_name);
      setClientPhone(client.phone ? formatBRPhone(client.phone) : "");
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!valid || !parsedDate) return;

    const input = {
      client_id: selectedClient?.id ?? null,
      client_name: clientName.trim(),
      client_phone: clientPhone.trim() ? normalizeBRPhone(clientPhone) : null,
      employee_id: employeeId,
      service_name: serviceName.trim(),
      scheduled_at: parsedDate.toISOString(),
    };

    try {
      if (isEdit && appointment) {
        await updateMutation.mutateAsync({ id: appointment.id, input });
        toast.success("Agendamento atualizado.");
      } else {
        await createMutation.mutateAsync(input);
        toast.success("Agendamento criado! ✂️");
      }
      onClose();
    } catch (error) {
      toast.error(friendlyError(error));
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={isEdit ? "Editar agendamento" : "Novo agendamento"}
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
              disabled={!valid}
            >
              {isEdit ? "Salvar" : "Agendar"}
            </Button>
          </div>
        }
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <ClientAutocomplete
            selected={selectedClient}
            value={clientName}
            onValueChange={setClientName}
            onSelect={handleClientSelected}
            onRequestCreate={(name) => {
              setPrefillName(name);
              setClientFormOpen(true);
            }}
            disabled={pending}
          />

          <Input
            label="WhatsApp da cliente"
            type="tel"
            inputMode="numeric"
            placeholder="(79) 99999-8888"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            icon={<Phone className="h-4 w-4" />}
            hint="Usado no aviso de cancelamento."
            disabled={pending}
          />

          <Input
            label="Serviço"
            placeholder="Corte + Escova"
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            icon={<Scissors className="h-4 w-4" />}
            list="service-suggestions"
            required
            disabled={pending}
          />
          <datalist id="service-suggestions">
            {SERVICE_SUGGESTIONS.map((service) => (
              <option key={service} value={service} />
            ))}
          </datalist>

          <Input
            label="Data e hora"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            icon={<CalendarClock className="h-4 w-4" />}
            max={toDatetimeLocalValue(maxAheadDate())}
            required
            disabled={pending}
            error={beyondHorizon ? "Só é possível agendar até 2 meses à frente." : undefined}
            hint={!beyondHorizon ? "Limite: 2 meses a partir de hoje." : undefined}
          />

          {/* Employees always book for themselves; only the owner can assign. */}
          {isAdmin ? (
            <Select
              label="Profissional"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              required
              disabled={pending}
              hint="Como administradora, você pode atribuir a qualquer profissional."
            >
              <option value="" disabled>
                Selecione…
              </option>
              {employees?.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name}
                  {employee.role === "super_admin" ? " (você)" : ""}
                </option>
              ))}
            </Select>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-muted">
              <UserRound className="h-4 w-4" />
              Agendamento em seu nome
            </div>
          )}

          <button type="submit" className="hidden" aria-hidden />
        </form>
      </Modal>

      {/* Inline "cadastrar cliente" launched from the autocomplete. */}
      <ClientForm
        open={clientFormOpen}
        onClose={() => setClientFormOpen(false)}
        prefillName={prefillName}
        onCreated={(client) => handleClientSelected(client)}
      />
    </>
  );
}
