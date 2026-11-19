import type { ReactNode } from "react";

/**
 * Page title block shared by the public information pages.
 */
export function PageHero({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-sand/80 bg-base-200/45">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-[4.5rem]">
        <p className="badge-pill">{eyebrow}</p>
        <h1 className="mt-5 max-w-4xl font-display text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-ink sm:text-5xl lg:text-[3.5rem]">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-[1.7] text-clay sm:text-lg">
          {lede}
        </p>
        {children && (
          <div className="mt-7 flex flex-wrap items-center gap-3">{children}</div>
        )}
      </div>
    </section>
  );
}
