import { useCallback, useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import {
  disablePush,
  enablePush,
  isIOS,
  isPushEnabled,
  isStandalone,
  permissionState,
  pushSupported,
} from "@/lib/push";
import { useAuthStore } from "@/stores/authStore";
import { friendlyError } from "@/lib/cn";

export interface PushSetupState {
  supported: boolean;
  enabled: boolean;
  permission: NotificationPermission | "unsupported";
  /** iOS only delivers Web Push to an installed PWA (iOS 16.4+). */
  requiresInstall: boolean;
  busy: boolean;
  toggle: () => Promise<void>;
}

export function usePushSetup(): PushSetupState {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  const supported = pushSupported();
  const requiresInstall = isIOS() && !isStandalone();

  useEffect(() => {
    let cancelled = false;
    void isPushEnabled().then((value) => {
      if (!cancelled) setEnabled(value);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const toggle = useCallback(async () => {
    if (!userId) return;
    setBusy(true);
    try {
      if (enabled) {
        await disablePush();
        setEnabled(false);
        toast.success("Lembretes desativados neste dispositivo.");
      } else {
        // Must run inside the click handler — iOS requires a user gesture.
        await enablePush(userId);
        setEnabled(true);
        toast.success("Lembretes ativados! Avisaremos 20 min antes. 🔔");
      }
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setBusy(false);
    }
  }, [enabled, userId]);

  return { supported, enabled, permission: permissionState(), requiresInstall, busy, toggle };
}
