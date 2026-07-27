import { useEffect } from "react";
import { useUIStore } from "@/stores/uiStore";
import { isIOS, isStandalone } from "@/lib/push";

/** Captures the Chromium install prompt so a button can trigger it later. */
export function useInstallPromptListener() {
  const setInstallPrompt = useUIStore((s) => s.setInstallPrompt);

  useEffect(() => {
    const onPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault(); // stop the mini-infobar; we show our own button
      setInstallPrompt(event);
    };
    const onInstalled = () => setInstallPrompt(null);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [setInstallPrompt]);
}

export function useInstallState() {
  const installPrompt = useUIStore((s) => s.installPrompt);
  const setInstallPrompt = useUIStore((s) => s.setInstallPrompt);

  const installed = isStandalone();
  // iOS has no programmatic install — we show Add-to-Home-Screen instructions.
  const needsIOSInstructions = isIOS() && !installed;

  async function promptInstall() {
    if (!installPrompt) return false;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    setInstallPrompt(null);
    return outcome === "accepted";
  }

  return { installed, canPrompt: installPrompt !== null, needsIOSInstructions, promptInstall };
}
