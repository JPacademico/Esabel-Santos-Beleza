import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/** Maps Supabase/Postgres errors to friendly pt-BR copy for toasts. */
export function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials")) return "Usuário ou senha incorretos.";
  if (lower.includes("email not confirmed")) return "Conta ainda não ativada.";
  if (lower.includes("more than 2 months")) {
    return "Só é possível agendar até 2 meses à frente.";
  }
  if (lower.includes("cancel_requires_reason")) return "Informe o motivo do cancelamento.";
  if (lower.includes("row-level security") || lower.includes("violates row-level")) {
    return "Você não tem permissão para esta ação.";
  }
  if (lower.includes("duplicate key") && lower.includes("username")) {
    return "Este nome de usuário já está em uso.";
  }
  if (lower.includes("failed to fetch") || lower.includes("networkerror")) {
    return "Sem conexão. Verifique sua internet.";
  }
  if (lower.includes("user banned") || lower.includes("banned")) {
    return "Esta conta foi desativada.";
  }
  return message || "Algo deu errado. Tente novamente.";
}
