import { useState, type KeyboardEvent } from "react";
import { Plus, Scissors, X } from "lucide-react";
import { FieldWrap } from "@/components/ui/Field";
import { cn } from "@/lib/cn";

/** Common salon services — one tap each, which is the fast path in practice. */
const SUGGESTIONS = [
  "Corte",
  "Escova",
  "Coloração",
  "Hidratação",
  "Progressiva",
  "Manicure",
  "Pedicure",
  "Maquiagem",
  "Sobrancelha",
  "Depilação",
  "Penteado",
  "Unha em gel",
];

/** Mirrors the DB check constraint on appointments.services. */
export const MAX_SERVICES = 10;

interface Props {
  value: string[];
  onChange: (services: string[]) => void;
  disabled?: boolean;
}

/** Case-insensitive membership, so "manicure" can't be added twice as "Manicure". */
function includesService(list: string[], service: string): boolean {
  const needle = service.trim().toLowerCase();
  return list.some((s) => s.toLowerCase() === needle);
}

/**
 * Picks one *or several* services for an appointment — clients regularly book
 * a combination ("Manicure + Pedicure").
 *
 * Chips rather than a multi-select: this is used one-handed on a phone while
 * the client is on WhatsApp, and a native multi-select needs ctrl/cmd-click.
 * The free-text field stays because the salon's menu changes faster than any
 * hard-coded list would.
 */
export function ServicePicker({ value, onChange, disabled }: Props) {
  const [draft, setDraft] = useState("");
  const full = value.length >= MAX_SERVICES;

  function add(service: string) {
    const clean = service.trim();
    if (!clean || full) return;
    // Clear the draft even on a duplicate: the chip is already visible above,
    // so leaving the text behind just looks like the tap didn't register.
    setDraft("");
    if (includesService(value, clean)) return;
    onChange([...value, clean]);
  }

  function remove(service: string) {
    onChange(value.filter((s) => s !== service));
  }

  function onDraftKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Enter and comma both commit; Enter must not submit the surrounding form.
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add(draft);
    } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
      remove(value[value.length - 1]);
    }
  }

  const unpicked = SUGGESTIONS.filter((s) => !includesService(value, s));

  return (
    <FieldWrap
      label="Serviços"
      required
      hint={
        value.length === 0
          ? "Escolha um ou mais serviços para este agendamento."
          : full
            ? `Máximo de ${MAX_SERVICES} serviços.`
            : `${value.length} selecionado${value.length > 1 ? "s" : ""} · toque para remover.`
      }
    >
      {/* Selected services */}
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((service) => (
            <button
              key={service}
              type="button"
              onClick={() => remove(service)}
              disabled={disabled}
              aria-label={`Remover ${service}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent/12 py-1.5 pl-3 pr-2 text-xs font-medium text-accent transition hover:bg-accent/20 disabled:opacity-50"
            >
              <Scissors className="h-3 w-3" />
              {service}
              <X className="h-3.5 w-3.5 opacity-70" />
            </button>
          ))}
        </div>
      )}

      {/* Free-text entry for anything off the list */}
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          <Scissors className="h-4 w-4" />
        </span>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onDraftKeyDown}
          onBlur={() => add(draft)}
          disabled={disabled || full}
          placeholder={full ? "Limite atingido" : "Outro serviço…"}
          className="field pl-10 pr-11"
          aria-label="Adicionar serviço"
        />
        <button
          type="button"
          onClick={() => add(draft)}
          disabled={disabled || full || !draft.trim()}
          aria-label="Adicionar serviço"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-2 text-accent transition hover:bg-accent/10 disabled:opacity-30"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Quick picks */}
      {!full && unpicked.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {unpicked.map((service) => (
            <button
              key={service}
              type="button"
              onClick={() => add(service)}
              disabled={disabled}
              className={cn(
                "rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted transition",
                "hover:border-accent/40 hover:text-text disabled:opacity-50",
              )}
            >
              + {service}
            </button>
          ))}
        </div>
      )}
    </FieldWrap>
  );
}
