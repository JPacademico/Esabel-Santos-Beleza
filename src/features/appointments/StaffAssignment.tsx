import { Scissors, Users } from "lucide-react";
import { FieldWrap, Select } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import type { Profile } from "@/types/domain";

type Employee = Pick<Profile, "id" | "full_name" | "role" | "status">;

interface Props {
  services: string[];
  /** Positionally parallel to `services`. */
  assignments: string[];
  onAssignmentsChange: (next: string[]) => void;
  employees: Employee[] | undefined;
  split: boolean;
  onSplitChange: (split: boolean) => void;
  disabled?: boolean;
}

function EmployeeOptions({ employees }: { employees: Employee[] | undefined }) {
  return (
    <>
      <option value="" disabled>
        Selecione…
      </option>
      {employees?.map((employee) => (
        <option key={employee.id} value={employee.id}>
          {employee.full_name}
          {employee.role === "super_admin" ? " (você)" : ""}
        </option>
      ))}
    </>
  );
}

/**
 * Admin-only: who performs each service.
 *
 * Two modes, because the two cases have very different frequencies. Almost
 * every appointment is one professional doing everything, so that stays a
 * single dropdown. Splitting ("Manicure com a Ana, Pedicure com a Bruna") is
 * real but occasional, so it's behind a toggle rather than forcing a dropdown
 * per service onto every booking.
 */
export function StaffAssignment({
  services,
  assignments,
  onAssignmentsChange,
  employees,
  split,
  onSplitChange,
  disabled,
}: Props) {
  const lead = assignments[0] ?? "";

  function setAll(employeeId: string) {
    // Keep a single entry when no service is picked yet, otherwise choosing the
    // professional before the services would map over an empty array and be
    // silently discarded. The form realigns this the moment services change.
    onAssignmentsChange(services.length > 0 ? services.map(() => employeeId) : [employeeId]);
  }

  function setOne(index: number, employeeId: string) {
    onAssignmentsChange(assignments.map((current, i) => (i === index ? employeeId : current)));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-2">
        <p className="label mb-0">Profissional</p>
        {/* Splitting needs at least two services to mean anything. */}
        {services.length > 1 && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              const next = !split;
              // Collapsing back to one professional: the lead takes everything,
              // so we never submit a stale per-service mapping the admin can
              // no longer see.
              if (!next) setAll(lead);
              onSplitChange(next);
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition",
              split
                ? "border-accent/30 bg-accent/10 text-accent"
                : "border-border text-muted hover:border-accent/40 hover:text-text",
              disabled && "opacity-50",
            )}
          >
            <Users className="h-3.5 w-3.5" />
            {split ? "Uma profissional" : "Dividir serviços"}
          </button>
        )}
      </div>

      {split && services.length > 1 ? (
        <div className="space-y-2 rounded-lg border border-border bg-surface-2/50 p-2.5">
          {services.map((service, index) => (
            <div key={service} className="flex items-center gap-2">
              <span className="flex min-w-0 flex-1 items-center gap-1.5 text-xs font-medium text-text">
                <Scissors className="h-3.5 w-3.5 shrink-0 text-muted" />
                <span className="truncate">{service}</span>
              </span>
              <Select
                aria-label={`Profissional para ${service}`}
                value={assignments[index] ?? ""}
                onChange={(e) => setOne(index, e.target.value)}
                disabled={disabled}
                className="max-w-[55%] py-2 text-sm"
              >
                <EmployeeOptions employees={employees} />
              </Select>
            </div>
          ))}
          <p className="text-xs text-muted">
            A primeira profissional da lista fica como responsável pelo agendamento.
          </p>
        </div>
      ) : (
        <FieldWrap hint="Como administradora, você pode atribuir a qualquer profissional.">
          <Select
            aria-label="Profissional"
            value={lead}
            onChange={(e) => setAll(e.target.value)}
            disabled={disabled}
          >
            <EmployeeOptions employees={employees} />
          </Select>
        </FieldWrap>
      )}
    </div>
  );
}
