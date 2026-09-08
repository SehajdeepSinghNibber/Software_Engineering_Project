import type { ReactNode } from "react";

type NoticeVariant = "info" | "error" | "success" | "warning";

const VARIANT_CLASSES: Record<NoticeVariant, string> = {
  info: "border-info/25 bg-info/5 text-base-content",
  error: "border-error/30 bg-error/5 text-base-content",
  success: "border-success/30 bg-success/5 text-base-content",
  warning: "border-warning/40 bg-warning/10 text-base-content",
};

const DOT_CLASSES: Record<NoticeVariant, string> = {
  info: "bg-info",
  error: "bg-error",
  success: "bg-success",
  warning: "bg-warning",
};

/**
 * A quiet, hairline notice — deliberately not a daisyUI `alert`, which is too
 * loud for this design language. Used for errors, empty hints and meta states.
 */
export function Notice({
  variant = "info",
  title,
  children,
  className = "",
}: {
  variant?: NoticeVariant;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-field border px-4 py-3 text-sm leading-relaxed ${VARIANT_CLASSES[variant]} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT_CLASSES[variant]}`}
      />
      <div className="min-w-0">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={title ? "mt-0.5 opacity-80" : "opacity-80"}>{children}</div>}
      </div>
    </div>
  );
}