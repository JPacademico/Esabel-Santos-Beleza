import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface WrapProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  htmlFor?: string;
}

export function FieldWrap({ label, hint, error, required, children, htmlFor }: WrapProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="label" htmlFor={htmlFor}>
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/* ---------------------------------- Input --------------------------------- */

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, icon, className, id, required, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldWrap label={label} hint={hint} error={error} required={required} htmlFor={inputId}>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          required={required}
          className={cn("field", icon && "pl-10", error && "border-danger", className)}
          {...rest}
        />
      </div>
    </FieldWrap>
  );
});

/* --------------------------------- Textarea -------------------------------- */

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, id, required, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldWrap label={label} hint={hint} error={error} required={required} htmlFor={inputId}>
      <textarea
        ref={ref}
        id={inputId}
        required={required}
        className={cn("field resize-none", error && "border-danger", className)}
        {...rest}
      />
    </FieldWrap>
  );
});

/* ---------------------------------- Select --------------------------------- */

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, className, id, required, children, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldWrap label={label} hint={hint} error={error} required={required} htmlFor={inputId}>
      <select
        ref={ref}
        id={inputId}
        required={required}
        className={cn("field appearance-none pr-9", error && "border-danger", className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238a7c80' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.75rem center",
        }}
        {...rest}
      >
        {children}
      </select>
    </FieldWrap>
  );
});
