import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/Button";
import type { AccessLinkResult as AccessLinkResultData } from "@/types/domain";

interface Props {
  result: AccessLinkResultData;
  /** Short line explaining what the link does in this context. */
  note: string;
}

/**
 * Shared "here is the access link" panel, used after creating an employee and
 * after re-issuing access. Offers the WhatsApp deep link plus a copy fallback.
 */
export function AccessLinkPanel({ result, note }: Props) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(result.setup_url);
      setCopied(true);
      toast.success("Link copiado.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }

  return (
    <div className="space-y-4">
      {result.wa_link ? (
        <a
          href={result.wa_link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-success px-4 py-3 font-medium text-white transition hover:brightness-95 active:scale-[0.98]"
        >
          <MessageCircle className="h-5 w-5" />
          Enviar pelo WhatsApp
        </a>
      ) : (
        <p className="rounded-lg border border-warning/25 bg-warning/10 p-3 text-sm text-text">
          Esta funcionária não tem WhatsApp cadastrado. Copie o link e envie por outro meio.
        </p>
      )}

      <div>
        <p className="label">{result.wa_link ? "Ou copie o link" : "Link de acesso"}</p>
        <div className="flex gap-2">
          <input readOnly value={result.setup_url} className="field flex-1 text-xs" />
          <Button
            variant="secondary"
            size="icon"
            onClick={() => void copyLink()}
            aria-label="Copiar link"
          >
            {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <p className="rounded-lg bg-surface-2 p-3 text-xs text-muted">{note}</p>
    </div>
  );
}
