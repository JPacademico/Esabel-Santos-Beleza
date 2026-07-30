import { Check, Eye, EyeOff, Users2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Profile } from "@/types/domain";

type Employee = Pick<Profile, "id" | "full_name" | "role" | "status">;

interface Props {
  employees: Employee[];
  /** Ids currently rendered as columns. */
  visibleIds: Set<string>;
  /** id → number of appointments that day, for the chip counter. */
  counts: Map<string, number>;
  /** False = only professionals with appointments are shown (the default). */
  showAll: boolean;
  onToggleShowAll: () => void;
  onToggleEmployee: (id: string, currentlyVisible: boolean) => void;
  /**
   * True when the auto rule was bypassed because nobody had an appointment —
   * hiding every column would leave nothing to book against.
   */
  autoRuleSuspended: boolean;
}

/** First name only — the chips have to fit several across a phone. */
function shortName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

/**
 * Toggle group for which professionals appear as columns in the grid.
 *
 * A toggle group rather than a `<select multiple>`: the state of every
 * professional has to be readable at a glance (that IS the information — who is
 * on shift), and a native multi-select hides it behind a dropdown and needs
 * ctrl-click on desktop.
 */
export function EmployeeFilter({
  employees,
  visibleIds,
  counts,
  showAll,
  onToggleShowAll,
  onToggleEmployee,
  autoRuleSuspended,
}: Props) {
  return (
    <div className="mb-3 rounded-lg border border-border bg-surface p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted">
          <Users2 className="h-3.5 w-3.5" />
          Profissionais na grade
        </span>

        <button
          type="button"
          onClick={onToggleShowAll}
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-accent transition hover:bg-accent/10"
        >
          {showAll ? (
            <>
              <EyeOff className="h-3.5 w-3.5" />
              Ocultar sem agenda
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" />
              Mostrar todas
            </>
          )}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {employees.map((employee) => {
          const visible = visibleIds.has(employee.id);
          const count = counts.get(employee.id) ?? 0;
          return (
            <button
              key={employee.id}
              type="button"
              aria-pressed={visible}
              onClick={() => onToggleEmployee(employee.id, visible)}
              title={
                count === 0
                  ? `${employee.full_name} — sem agendamentos neste dia`
                  : `${employee.full_name} — ${count} agendamento(s)`
              }
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition",
                visible
                  ? "border-accent/30 bg-accent/10 text-accent"
                  : "border-border text-muted opacity-60 hover:opacity-100",
              )}
            >
              {/* Reserve the tick's width in both states so toggling doesn't reflow the row. */}
              <Check className={cn("h-3 w-3 shrink-0", !visible && "invisible")} />
              {shortName(employee.full_name)}
              {count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
                    visible ? "bg-surface" : "bg-surface-2",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!showAll && !autoRuleSuspended && (
        <p className="mt-2 text-[11px] leading-snug text-muted">
          Profissionais sem agendamentos neste dia ficam ocultas. Toque no nome para
          exibir e agendar.
        </p>
      )}
    </div>
  );
}
