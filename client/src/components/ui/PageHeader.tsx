import type { ReactNode } from "react";

/** Consistent page title block used across the authenticated area. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-5 sm:mb-9">
      <div className="max-w-2xl">
        <h1 className="font-sans text-[1.65rem] font-semibold leading-tight tracking-[-0.04em] text-ink sm:text-[1.9rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-base-content/60">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
