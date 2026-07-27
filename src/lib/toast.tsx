import { toast as sonner } from "sonner";
import { CheckCircle2, Info, Scissors, TriangleAlert, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Variant = "success" | "error" | "info" | "warning";

const ICONS: Record<Variant, LucideIcon> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: TriangleAlert,
};

const DEFAULT_DURATION = 3500;

/**
 * Branded toast. Everything animated here is decorative (transform/scale on
 * the chip, scaleX on the progress bar) — the text itself is never faded in,
 * so a stalled animation can't hide the message.
 */
function show(variant: Variant, message: string, description?: string, duration = DEFAULT_DURATION) {
  const Icon = ICONS[variant];

  return sonner.custom(
    (id) => (
      <div
        role="status"
        aria-live="polite"
        onClick={() => sonner.dismiss(id)}
        className={`esb-toast esb-toast--${variant}`}
      >
        <span className="esb-toast__chip">
          <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </span>

        <div className="esb-toast__body">
          <p className="esb-toast__title">{message}</p>
          {description && <p className="esb-toast__desc">{description}</p>}
        </div>

        {/* Salon watermark — pure decoration, sits behind the content. */}
        <Scissors className="esb-toast__mark" aria-hidden />

        <span className="esb-toast__bar" style={{ animationDuration: `${duration}ms` }} />
      </div>
    ),
    { duration },
  );
}

export const toast = {
  success: (message: string, description?: string) => show("success", message, description),
  error: (message: string, description?: string) => show("error", message, description),
  info: (message: string, description?: string) => show("info", message, description),
  warning: (message: string, description?: string) => show("warning", message, description),
  dismiss: sonner.dismiss,
};
