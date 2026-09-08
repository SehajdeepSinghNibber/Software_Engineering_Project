import type { ReactNode } from "react";

/** Quiet placeholder for empty views — one line of guidance, one action. */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-box border border-dashed border-base-300 px-6 py-14 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-base-content/55">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}