import { supabase } from "./supabase";

/** VAPID keys are base64url; PushManager wants a Uint8Array. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function pushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** True when running as an installed PWA (required for Web Push on iOS). */
export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari legacy flag
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function permissionState(): NotificationPermission | "unsupported" {
  return pushSupported() ? Notification.permission : "unsupported";
}

export async function isPushEnabled(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.ready;
  return (await reg.pushManager.getSubscription()) !== null;
}

/**
 * Requests permission and registers this device for reminders.
 * MUST be called from a user gesture (iOS requirement).
 */
export async function enablePush(userId: string): Promise<void> {
  if (!pushSupported()) throw new Error("Este dispositivo não suporta notificações push.");

  if (isIOS() && !isStandalone()) {
    throw new Error(
      "No iPhone/iPad, instale o app na Tela de Início antes de ativar os lembretes.",
    );
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "Notificações bloqueadas. Libere nas configurações do navegador."
        : "Permissão de notificação não concedida.",
    );
  }

  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidKey) throw new Error("VITE_VAPID_PUBLIC_KEY não configurada.");

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  const subscription =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    }));

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Não foi possível registrar este dispositivo.");
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent,
    },
    { onConflict: "endpoint" },
  );
  if (error) throw error;
}

/** Removes this device's subscription (called on logout and on manual disable). */
export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (!subscription) return;
    await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
    await subscription.unsubscribe();
  } catch {
    // Best-effort: never block logout on push cleanup.
  }
}
