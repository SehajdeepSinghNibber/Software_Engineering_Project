import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** Closing call-to-action band shared by the marketing pages. */
export function CtaBand({
  title,
  body,
  href,
  label,
}: {
  title: string;
  body: string;
  href: string;
  label: string;
}) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 sm:pb-24 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl bg-maroon px-6 py-14 text-center shadow-lift sm:px-10 sm:py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_120%,rgb(69_19_10)_0%,transparent_100%)]"
        />
        <div className="relative">
          <h2 className="font-display text-3xl leading-tight tracking-[0.01em] text-cream sm:text-4xl">
            {title}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-cream/75">{body}</p>
          <Link href={href} className="btn-pill btn-pill-inverse group mt-8 px-7 py-3.5">
            {label}
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}