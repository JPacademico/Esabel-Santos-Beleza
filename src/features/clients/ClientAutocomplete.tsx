import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Search, UserPlus, X } from "lucide-react";
import { Input } from "@/components/ui/Field";
import { formatBRPhone } from "@/lib/whatsapp";
import { useClientSearch } from "./hooks";
import type { Client } from "@/types/domain";

interface Props {
  /** The currently linked client, if one was picked from the directory. */
  selected: Client | null;
  /** Free-typed name for one-off clients (kept in sync by the parent form). */
  value: string;
  onValueChange: (value: string) => void;
  onSelect: (client: Client | null) => void;
  onRequestCreate: (prefillName: string) => void;
  disabled?: boolean;
  error?: string;
}

/**
 * Dual-mode client picker: choose a registered client (links client_id and
 * snapshots name/phone) or just type a name for a one-off walk-in.
 */
export function ClientAutocomplete({
  selected,
  value,
  onValueChange,
  onSelect,
  onRequestCreate,
  disabled,
  error,
}: Props) {
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<number | null>(null);
  const { data: results, isFetching } = useClientSearch(open ? value : "");

  function pick(client: Client) {
    onSelect(client);
    onValueChange(client.full_name);
    setOpen(false);
  }

  function clear() {
    onSelect(null);
    onValueChange("");
    setOpen(false);
  }

  // Delay closing so a click inside the dropdown registers before blur.
  function handleBlur() {
    blurTimer.current = window.setTimeout(() => setOpen(false), 150);
  }
  function handleFocus() {
    if (blurTimer.current) window.clearTimeout(blurTimer.current);
    setOpen(true);
  }

  const showDropdown = open && value.trim().length >= 2 && !selected;

  return (
    <div className="relative">
      <Input
        label="Cliente"
        placeholder="Buscar ou digitar o nome…"
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
          if (selected) onSelect(null); // typing over a pick unlinks it
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        icon={
          selected ? (
            <Check className="h-4 w-4 text-success" />
          ) : (
            <Search className="h-4 w-4" />
          )
        }
        autoComplete="off"
        required
        disabled={disabled}
        error={error}
        className="pr-10"
      />

      {(selected || value) && !disabled && (
        <button
          type="button"
          onClick={clear}
          aria-label="Limpar cliente"
          className="absolute right-2 top-[30px] rounded-lg p-2 text-muted transition hover:text-text"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {selected && (
        <p className="mt-1 text-xs text-success">
          Cliente cadastrada · {formatBRPhone(selected.phone)}
        </p>
      )}

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-float"
          >
            {isFetching && (
              <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Buscando…
              </div>
            )}

            {!isFetching &&
              results?.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(client)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:bg-surface-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-text">
                      {client.full_name}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {formatBRPhone(client.phone)}
                    </span>
                  </span>
                </button>
              ))}

            {!isFetching && (results?.length ?? 0) === 0 && (
              <div className="px-3 py-2.5 text-sm text-muted">
                Nenhuma cliente encontrada. Use o nome digitado ou cadastre.
              </div>
            )}

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setOpen(false);
                onRequestCreate(value.trim());
              }}
              className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-sm font-medium text-accent transition hover:bg-accent/8"
            >
              <UserPlus className="h-4 w-4" />
              Cadastrar “{value.trim()}”
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
