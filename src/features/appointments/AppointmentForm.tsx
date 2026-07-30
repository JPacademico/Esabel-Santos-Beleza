import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertTriangle, CalendarClock, Phone, UserRound } from "lucide-react";
import { toast } from "@/lib/toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { ClientAutocomplete } from "@/features/clients/ClientAutocomplete";
import { ClientForm } from "@/features/clients/ClientForm";
import { useAuthStore } from "@/stores/authStore";
import { friendlyError } from "@/lib/cn";
import {
  alignAssignments,
  appointmentServices,
  formatServices,
  serviceAssignments,
} from "@/lib/services";
import { formatBRPhone, hasWhatsApp, normalizeBRPhone } from "@/lib/whatsapp";
import {
  canScheduleAt,
  formatTime,
  fromDatetimeLocalValue,
  maxAheadDate,
  toDatetimeLocalValue,
} from "@/lib/dates";
import { ServicePicker } from "./ServicePicker";
import { StaffAssignment } from "./StaffAssignment";
import {
  fetchSlotConflicts,
  useCreateAppointment,
  useEmployeeOptions,
  useUpdateAppointment,
} from "./hooks";
import type { AppointmentWithEmployee, Client } from "@/types/domain";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Existing appointment to edit, or null to create a new one. */
  appointment?: AppointmentWithEmployee | null;
  /** Day the agenda is currently showing — seeds the date field. */
  defaultDate: Date;
  /**
   * Exact slot to pre-fill, set when booking from a master-grid cell. Takes
   * precedence over `defaultDate`'s 09:00 default.
   */
  seedScheduledAt?: Date;
  /** Professional to pre-fill, set when booking from a master-grid cell. */
  seedEmployeeId?: string;
}

export function AppointmentForm({
  open,
  onClose,
  appointment,
  defaultDate,
  seedScheduledAt,
  seedEmployeeId,
}: Props) {
  const isEdit = Boolean(appointment);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const userId = useAuthStore((s) => s.session?.user.id ?? "");

  // Only the owner sees a "Profissional" selector; employees always book for
  // themselves, so there's no reason to fetch the roster on their devices.
  const { data: employees } = useEmployeeOptions(isAdmin);
  const createMutation = useCreateAppointment();
  const updateMutation = useUpdateAppointment();

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [services, setServices] = useState<string[]>([]);
  /** Positionally parallel to `services` — who performs services[i]. */
  const [assignments, setAssignments] = useState<string[]>([]);
  const [splitStaff, setSplitStaff] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [prefillName, setPrefillName] = useState("");
  /** Non-empty while the double-booking warning is showing. */
  const [conflicts, setConflicts] = useState<AppointmentWithEmployee[]>([]);
  const [checking, setChecking] = useState(false);

  // Declared after `checking` so it can include the conflict pre-flight: the
  // save button must show a spinner during that query too, or a slow network
  // looks like a dead button and invites a second tap.
  const pending = createMutation.isPending || updateMutation.isPending || checking;

  /**
   * Seed the form once per open, and never again while it stays open.
   *
   * The guard is the important part: this effect depends on `appointment` and
   * `defaultDate`, which are objects. The agenda behind this modal re-renders
   * on a 60-second clock tick (and on every realtime event), so without the
   * ref check a new prop identity would re-run the seeding and silently wipe
   * whatever the user had typed.
   *
   * Keyed by appointment id so switching straight from one edit to another —
   * or from "new" to an edit — still re-seeds as it should.
   */
  const seededFor = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      seededFor.current = null; // re-arm for the next open
      return;
    }
    // The seed is part of the key: two different grid cells both open a "new"
    // form, and without this the second would keep the first cell's slot.
    const seedKey =
      appointment?.id ??
      `new:${seedEmployeeId ?? ""}:${seedScheduledAt?.getTime() ?? ""}`;
    if (seededFor.current === seedKey) return;
    seededFor.current = seedKey;

    // Never carry a previous submission's warning into a fresh form.
    setConflicts([]);
    setChecking(false);

    if (appointment) {
      // Falls back to the joined string / lead employee for rows predating
      // multi-service and per-service assignment.
      const seededServices = appointmentServices(appointment);
      const seededStaff = serviceAssignments(appointment);
      setSelectedClient(null);
      setClientName(appointment.client_name);
      setClientPhone(appointment.client_phone ? formatBRPhone(appointment.client_phone) : "");
      setServices(seededServices);
      setAssignments(seededStaff);
      // Open straight into split mode when the appointment already is split,
      // otherwise the admin would see a single dropdown misrepresenting it.
      setSplitStaff(new Set(seededStaff).size > 1);
      setScheduledAt(toDatetimeLocalValue(new Date(appointment.scheduled_at)));
    } else {
      // A grid cell supplies the exact slot; otherwise default to the visible
      // day at 09:00.
      const seed = seedScheduledAt ?? new Date(defaultDate);
      if (!seedScheduledAt) seed.setHours(9, 0, 0, 0);

      setSelectedClient(null);
      setClientName("");
      setClientPhone("");
      setServices([]);
      // A grid cell also names the column it was clicked in; otherwise default
      // to whoever is booking (the admin herself).
      setAssignments([seedEmployeeId || userId]);
      setSplitStaff(false);
      setScheduledAt(toDatetimeLocalValue(seed));
    }
  }, [open, appointment, defaultDate, userId, seedScheduledAt, seedEmployeeId]);

  /**
   * Services and assignments must stay the same length, so they change
   * together. Assignments follow their service by name, so removing one from
   * the middle doesn't shift the rest onto the wrong professional.
   */
  function handleServicesChange(next: string[]) {
    // A newly added service inherits the lead professional (self, for employees).
    const fallback = assignments[0] || userId;
    setAssignments(alignAssignments(services, assignments, next, fallback));
    setServices(next);
  }

  const parsedDate = scheduledAt ? fromDatetimeLocalValue(scheduledAt) : null;
  const dateValid = parsedDate !== null && !Number.isNaN(parsedDate.getTime());
  const beyondHorizon = dateValid && !canScheduleAt(parsedDate);

  // The phone is optional, but a half-typed one is worse than none: it would
  // enable a WhatsApp button that opens on a number nobody owns.
  const phoneTyped = clientPhone.trim().length > 0;
  const phoneUsable = hasWhatsApp(clientPhone);
  const phoneInvalid = phoneTyped && !phoneUsable;

  /**
   * Employees always book for themselves — the assignment UI is admin-only, so
   * their array is derived rather than trusted from state. This mirrors the DB
   * trigger, which rejects a non-admin assigning work to anyone else.
   */
  const finalAssignments = isAdmin ? assignments : services.map(() => userId);

  // Every service needs a professional before this can be saved.
  const staffComplete =
    finalAssignments.length === services.length && finalAssignments.every(Boolean);

  const hasConflict = conflicts.length > 0;

  const valid =
    clientName.trim() &&
    services.length > 0 &&
    staffComplete &&
    dateValid &&
    !beyondHorizon &&
    !phoneInvalid;

  function handleClientSelected(client: Client | null) {
    setSelectedClient(client);
    if (client) {
      setClientName(client.full_name);
      setClientPhone(client.phone ? formatBRPhone(client.phone) : "");
    }
  }

  async function save() {
    if (!parsedDate) return;

    const input = {
      client_id: selectedClient?.id ?? null,
      client_name: clientName.trim(),
      client_phone: phoneUsable ? normalizeBRPhone(clientPhone) : null,
      // The lead is whoever performs the first service; the DB trigger enforces
      // the same rule, so sending anything else would just be overwritten.
      employee_id: finalAssignments[0],
      services,
      service_employee_ids: finalAssignments,
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

  /**
   * Soft-block on double booking.
   *
   * Lives here rather than in either page, so the warning covers every route
   * that books — the master grid and the day agenda both go through this form.
   *
   * Deliberately a warning and not a rule: overlapping on purpose is legitimate
   * (a colour setting while another client is under the dryer), so the DB has no
   * constraint for it. That also means a failed check must not block the save —
   * if the pre-flight query errors we fall through and book, because refusing to
   * save because we couldn't *warn* would be worse than the double booking.
   */
  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!valid || !parsedDate || pending) return;

    setChecking(true);
    try {
      const found = await fetchSlotConflicts({
        employeeIds: [...new Set(finalAssignments)],
        at: parsedDate,
        excludeId: appointment?.id,
      });
      if (found.length > 0) {
        setConflicts(found);
        return;
      }
    } catch (error) {
      console.warn("Verificação de conflito falhou; seguindo com o agendamento.", error);
    } finally {
      setChecking(false);
    }

    await save();
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={
          hasConflict
            ? "Horário já ocupado"
            : isEdit
              ? "Editar agendamento"
              : "Novo agendamento"
        }
        dismissible={!pending}
        footer={
          hasConflict ? (
            /*
              Rendered inside THIS modal rather than as a second stacked one:
              the codebase already uses a two-step body for the cancel flow, and
              a nested overlay would mean juggling z-index and focus traps for
              no benefit.
            */
            <div className="flex gap-2">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setConflicts([])}
                disabled={pending}
              >
                Escolher outro
              </Button>
              <Button
                variant="danger"
                fullWidth
                loading={pending}
                // Cleared AFTER the save resolves, not before: clearing first
                // would flip the panel back to the form for the duration of the
                // request, so the confirmation appears to have been ignored.
                onClick={() => void save().finally(() => setConflicts([]))}
              >
                Agendar mesmo assim
              </Button>
            </div>
          ) : (
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
          )
        }
      >
        {hasConflict ? (
          <div className="space-y-3">
            <div className="flex gap-3 rounded-lg border border-warning/25 bg-warning/10 p-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
              <p className="text-sm text-text">
                Este horário já está ocupado. Tem certeza que deseja agendar duas clientes
                para a mesma profissional?
              </p>
            </div>

            <div className="space-y-2">
              {conflicts.map((conflict) => (
                <div
                  key={conflict.id}
                  className="rounded-lg border border-border bg-surface-2 p-2.5 text-xs"
                >
                  <p className="font-semibold text-text">
                    {formatTime(conflict.scheduled_at)} · {conflict.client_name}
                  </p>
                  <p className="mt-0.5 text-muted">
                    {formatServices(conflict)}
                    {conflict.employee?.full_name ? ` · ${conflict.employee.full_name}` : ""}
                  </p>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted">
              Agendamentos simultâneos são permitidos — este é apenas um aviso.
            </p>
          </div>
        ) : (
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
            label="WhatsApp da cliente (opcional)"
            type="tel"
            inputMode="numeric"
            placeholder="(79) 99999-8888"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            icon={<Phone className="h-4 w-4" />}
            disabled={pending}
            error={phoneInvalid ? "Número incompleto. Use DDD + número, ou deixe em branco." : undefined}
            hint={
              phoneInvalid
                ? undefined
                : phoneUsable
                  ? "Usado no aviso de cancelamento."
                  : "Sem número, o botão do WhatsApp fica indisponível e o cancelamento não envia aviso."
            }
          />

          <ServicePicker value={services} onChange={handleServicesChange} disabled={pending} />

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
            <StaffAssignment
              services={services}
              assignments={assignments}
              onAssignmentsChange={setAssignments}
              employees={employees}
              split={splitStaff}
              onSplitChange={setSplitStaff}
              disabled={pending}
            />
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-muted">
              <UserRound className="h-4 w-4" />
              Agendamento em seu nome
            </div>
          )}

          <button type="submit" className="hidden" aria-hidden />
        </form>
        )}
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
