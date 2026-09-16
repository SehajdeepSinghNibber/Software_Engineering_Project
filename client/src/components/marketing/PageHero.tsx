import type { ReactNode } from "react";

/**
 * Consistent page hero for every marketing page: eyebrow badge, display-serif
 * heading and a muted lede, centered with generous whitespace.
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
    <section className="bg-parchment/50">
      <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
        <p className="badge-pill">
          <span className="badge-pill-dot" aria-hidden="true" />
          {eyebrow}
        </p>
        <h1 className="mt-6 font-display text-4xl leading-[1.1] tracking-[0.01em] text-ink sm:text-5xl">
          {title}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-[1.75] text-clay sm:text-lg">
          {lede}
        </p>
        {children && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">{children}</div>
        )}
      </div>
    </section>
  );
}