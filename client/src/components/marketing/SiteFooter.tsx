import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Logo } from "@/components/ui/Logo";

const LINK_GROUPS = [
  {
    title: "Product",
    links: [
      { href: "/", label: "Home" },
      { href: "/research", label: "Research" },
      { href: "/use-cases", label: "Use Cases" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/docs", label: "Docs" },
      { href: "/about", label: "About" },
      { href: "/login", label: "Sign in" },
    ],
  },
] as const;

/** Shared marketing footer — brand, site links, project meta. */
export function SiteFooter() {
  return (
    <footer className="border-t border-sand/80">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <p className="text-ink">
              <Logo />
            </p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-clay">
              Image de-hazing powered by research-grade AI. Restore scene radiance from a single
              hazy frame.
            </p>
          </div>

          {LINK_GROUPS.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink">
                {group.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-clay transition-colors duration-200 hover:text-maroon"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink">Project</p>
            <a
              href="https://github.com/SehajdeepSinghNibber/Software_Engineering_Project"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1 text-sm text-clay transition-colors duration-200 hover:text-maroon"
            >
              GitHub repository
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-sand/80 pt-6 text-xs text-clay/80">
          <p>© {new Date().getFullYear()} ClearLens — Image De-hazing Platform</p>
          <p>Software Engineering Project</p>
        </div>
      </div>
    </footer>
  );
}