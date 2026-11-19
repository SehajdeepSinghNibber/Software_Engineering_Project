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
      <div className="flex flex-col items-start justify-between gap-8 rounded-2xl bg-maroon px-6 py-9 text-white sm:px-9 sm:py-10 lg:flex-row lg:items-center lg:px-12">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl font-semibold leading-tight tracking-[-0.03em] text-white sm:text-3xl">
            {title}
          </h2>
          <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">{body}</p>
        </div>
        <div>
          <Link href={href} className="btn-pill btn-pill-inverse group px-5 py-3">
            {label}
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
