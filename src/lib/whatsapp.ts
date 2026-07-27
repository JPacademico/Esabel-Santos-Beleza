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

/** Opens WhatsApp in a new tab/app. Returns false if there is no usable number. */
export function openWhatsApp(phone: string | null | undefined, message: string): boolean {
  const number = normalizeBRPhone(phone);
  if (!number) return false;
  window.open(waLink(number, message), "_blank", "noopener,noreferrer");
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

export function onboardingMessage(o: { name: string; setupUrl: string }): string {
  const firstName = o.name.trim().split(/\s+/)[0] ?? o.name;
  return (
    `Olá ${firstName}! 💇 Bem-vindo(a) à equipe *Esabel Santos Beleza*.\n\n` +
    `Ative sua conta e crie sua senha no link abaixo:\n${o.setupUrl}\n\n` +
    `⚠️ O link é pessoal e expira em 72 horas.`
  );
}
