import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/**
 * Extracts a human-readable string from anything throwable.
 *
 * Supabase query errors are PLAIN OBJECTS, not Error instances — `String(e)`
 * gives "[object Object]" and `JSON.stringify(e)` can give "{}". Both used to
 * be shown to the user verbatim as the whole error message.
 */
function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>;
    const parts = [err.message, err.details, err.hint]
      .filter((p): p is string => typeof p === "string" && p.trim().length > 0);
    if (parts.length > 0) return parts.join(" — ");
    if (typeof err.error === "string" && err.error.trim()) return err.error;
    try {
      const dump = JSON.stringify(error);
      // "{}" and "[]" carry no information — treat them as empty.
      if (dump && dump !== "{}" && dump !== "[]") return dump;
    } catch {
      // circular or otherwise unserialisable
    }
  }
  return "";
}

/** Maps Supabase/Postgres errors to friendly pt-BR copy for toasts. */
export function friendlyError(error: unknown): string {
  const message = extractMessage(error);
  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials")) return "Usuário ou senha incorretos.";
  if (lower.includes("email not confirmed")) return "Conta ainda não ativada.";
  if (lower.includes("more than 2 months")) {
    return "Só é possível agendar até 2 meses à frente.";
  }
  if (lower.includes("cancel_requires_reason")) return "Informe o motivo do cancelamento.";
  if (lower.includes("conclude_requires_timestamp")) {
    return "Não foi possível concluir o agendamento. Recarregue a página e tente novamente.";
  }
  if (lower.includes("row-level security") || lower.includes("violates row-level")) {
    return "Você não tem permissão para esta ação.";
  }
  if (lower.includes("duplicate key") && lower.includes("username")) {
    return "Este nome de usuário já está em uso.";
  }
  if (lower.includes("foreign key constraint")) {
    return "Registro relacionado não encontrado. Recarregue a página e tente novamente.";
  }
  if (lower.includes("profiles_username_check")) {
    return "Usuário inválido: use 3–30 caracteres minúsculos, números, ponto, hífen ou _.";
  }
  if (lower.includes("null value") && lower.includes("violates not-null")) {
    return "Preencha todos os campos obrigatórios.";
  }
  if (lower.includes("failed to fetch") || lower.includes("networkerror")) {
    return "Sem conexão. Verifique sua internet.";
  }
  // supabase-js reports an unreachable Edge Function this way — it happens both
  // when offline and when the function was never deployed.
  if (lower.includes("failed to send a request")) {
    return "Não foi possível contatar o servidor. Verifique sua conexão — ou se a função foi publicada no Supabase.";
  }
  if (lower.includes("user banned") || lower.includes("banned")) {
    return "Esta conta foi desativada.";
  }
  return message || "Algo deu errado. Tente novamente.";
}
