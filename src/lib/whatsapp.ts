import { formatFullPtBR } from "./dates";
import { BRAND_WA } from "./brand";

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

/**
 * Whether this phone can actually receive a WhatsApp message.
 *
 * The phone is optional on an appointment (one-off walk-ins often don't leave
 * one), so every WhatsApp affordance in the app gates on this single predicate
 * rather than on a truthiness check — `"  "` and `"(79)"` are both present but
 * useless, and `wa.me` would open on a nonexistent number rather than fail.
 *
 * A Brazilian mobile is DDD (2) + 8 or 9 digits, optionally prefixed with 55.
 */
export function hasWhatsApp(phone: string | null | undefined): boolean {
  let d = (phone ?? "").replace(/\D/g, "");
  if (d.startsWith(BR_COUNTRY_CODE) && d.length > 11) d = d.slice(2);
  return d.length === 10 || d.length === 11;
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
  if (!hasWhatsApp(phone)) return false;
  const number = normalizeBRPhone(phone);

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

/** "Maria" from "Maria da Silva" — messages address the client informally. */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

/** Opening line shared by every outgoing client message. */
export function greeting(fullName: string): string {
  return `Olá ${firstName(fullName)}! 💇‍♀️ Aqui é do ${BRAND_WA}.`;
}

export function cancellationMessage(o: {
  clientName: string;
  service: string;
  scheduledAt: string;
  reason: string;
}): string {
  return (
    `${greeting(o.clientName)}\n\n` +
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
