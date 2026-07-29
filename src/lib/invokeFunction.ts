import { supabase } from "./supabase";

/** An Edge Function error carrying the server's own message and HTTP status. */
export class FunctionError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "FunctionError";
    this.status = status;
  }
}

/**
 * Reads a Response body without assuming it is still unread.
 * supabase-js may already have consumed it, in which case clone() throws.
 */
async function readBody(res: Response): Promise<string | null> {
  try {
    return await res.clone().text();
  } catch {
    try {
      return await res.text();
    } catch {
      return null;
    }
  }
}

/**
 * Calls an Edge Function and surfaces the server's actual error message.
 *
 * supabase-js reports every non-2xx as the generic "Edge Function returned a
 * non-2xx status code" and hides the real body on `error.context`. Without
 * digging it out, the UI showed useless text — including a bare "{}" when the
 * body held a serialised object.
 */
export async function invokeFunction<T>(name: string, body: object = {}): Promise<T> {
  try {
    return await callFunction<T>(name, body);
  } catch (e) {
    // A 401 usually means the access token aged out while the tab sat idle:
    // the JWT lives an hour and the background refresh doesn't always fire in a
    // hidden tab. Refresh once and retry rather than making the admin sign in
    // again mid-action. Only retried once, and only for 401, so a genuinely
    // rejected caller still fails fast.
    if (!(e instanceof FunctionError) || e.status !== 401) throw e;

    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) throw e;

    return await callFunction<T>(name, body);
  }
}

async function callFunction<T>(name: string, body: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, {
    body: body as Record<string, unknown>,
  });

  if (!error) return data as T;

  const res = (error as { context?: Response }).context;
  const status = res?.status;

  if (res && typeof res.text === "function") {
    const raw = await readBody(res);

    if (raw) {
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        // Not JSON — an HTML gateway/proxy error page, most likely.
        throw new FunctionError(raw.trim().slice(0, 200), status);
      }

      const serverError = (parsed as { error?: unknown } | null)?.error;
      if (typeof serverError === "string" && serverError.trim()) {
        throw new FunctionError(serverError, status);
      }
      if (serverError && typeof serverError === "object") {
        const m = (serverError as { message?: unknown }).message;
        if (typeof m === "string" && m.trim()) throw new FunctionError(m, status);
      }
    }
  }

  if (status === 404) {
    throw new FunctionError(
      `A função "${name}" não está publicada no Supabase. Rode: supabase functions deploy ${name}`,
      404,
    );
  }

  throw new FunctionError(
    status ? `${error.message} (HTTP ${status})` : error.message,
    status,
  );
}
