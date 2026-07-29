/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope;

// Precache the app shell only. Supabase API calls are deliberately NOT cached:
// the data is authenticated and live, so stale reads would be worse than none.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

self.addEventListener("install", () => {
  void self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

interface ReminderPayload {
  title?: string;
  body?: string;
  url?: string;
}

/** Push sent by the send-reminders Edge Function (~20 min before an appointment). */
self.addEventListener("push", (event) => {
  let payload: ReminderPayload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { body: event.data?.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Studio Esabel Santos", {
      body: payload.body ?? "Você tem um atendimento em breve.",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: "esb-reminder",
      renotify: true,
      vibrate: [80, 40, 80],
      data: { url: payload.url ?? "/" },
    } as NotificationOptions),
  );
});

/** Focus an open tab if there is one, otherwise open the app at the target URL. */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data as { url?: string } | undefined)?.url ?? "/";

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of windows) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(target);
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
