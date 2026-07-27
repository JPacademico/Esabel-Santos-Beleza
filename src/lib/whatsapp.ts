import { formatFullPtBR } from "./dates";

const BR_COUNTRY_CODE = "55";

/** Strips formatting and guarantees the Brazilian country code. */
export function normalizeBRPhone(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith(BR_COUNTRY_CODE) ? digits : `${BR_COUNTRY_CODE}${digits}`;
}

/** Pretty display: (79) 99675-4015 — accepts stored digits with or without 55. */
export function formatBRPhone(phone: string | null | undefined): string {
  let d = (phone ?? "").replace(/\D/g, "");
  if (!d) return "—";
  if (d.startsWith(BR_COUNTRY_CODE) && d.length > 11) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone ?? "—";
}

export function waLink(phone: string | null | undefined, message: string): string {
  return `https://wa.me/${normalizeBRPhone(phone)}?text=${encodeURIComponent(message)}`;
}

/**
 * Tries to open WhatsApp. Returns whether a window was actually opened.
 *
 * Two things matter here:
 *  - `noopener` is NOT passed in the features string: with it the browser
 *    returns null even on success, making a blocked popup indistinguishable
 *    from a successful one. We sever `opener` manually instead.
 *  - Browsers (iOS Safari especially) block this unless it runs synchronously
 *    inside a user gesture. After an `await` it will usually fail, so callers
 *    must always offer a real <a href> fallback rather than assume success.
 */
export function openWhatsApp(phone: string | null | undefined, message: string): boolean {
  const number = normalizeBRPhone(phone);
  if (!number) return false;

  const win = window.open(waLink(number, message), "_blank");
  if (!win) return false;

  try {
    win.opener = null;
  } catch {
    // Cross-origin navigation already happened; nothing to sever.
  }
  return true;
}

/* ------------------------------- templates -------------------------------- */

export function cancellationMessage(o: {
  clientName: string;
  service: string;
  scheduledAt: string;
  reason: string;
}): string {
  const firstName = o.clientName.trim().split(/\s+/)[0] ?? o.clientName;
  return (
    `Olá ${firstName}! 💇‍♀️ Aqui é do *Esabel Santos Beleza*.\n\n` +
    `Precisamos *cancelar* o seu agendamento:\n` +
    `🗓️ ${o.service}\n` +
    `⏰ ${formatFullPtBR(o.scheduledAt)}\n` +
    `📝 Motivo: ${o.reason}\n\n` +
    `Pedimos desculpas pelo transtorno. ` +
    `É só nos chamar por aqui que reagendamos no melhor horário para você! 💖`
  );
}

// Note: onboarding and password-reset WhatsApp messages are built server-side
// (create-employee / reset-employee-password) because those functions own the
// one-time token. Keeping a copy here would silently drift out of sync.
