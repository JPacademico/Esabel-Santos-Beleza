import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:brightness-95 active:brightness-90 shadow-card",
  secondary: "bg-surface-2 text-text border border-border hover:bg-border/40",
  ghost: "text-text hover:bg-surface-2",
  danger: "bg-danger text-white hover:brightness-95 active:brightness-90",
  success: "bg-success text-white hover:brightness-95 active:brightness-90",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
  lg: "h-12 px-5 text-base gap-2",
  icon: "h-10 w-10 justify-center",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, fullWidth, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center rounded-lg font-medium transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        "disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full justify-center",
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
