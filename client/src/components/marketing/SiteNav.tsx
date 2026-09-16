"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";

import { useSession } from "@/components/providers/SessionProvider";
import { Logo } from "@/components/ui/Logo";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/research", label: "Research" },
  { href: "/use-cases", label: "Use Cases" },
  { href: "/docs", label: "Docs" },
  { href: "/about", label: "About" },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Marketing top navigation: brand on the left, centered section links with a
 * subtle animated underline for the active item, session actions on the right.
 */
export function SiteNav() {
  const pathname = usePathname();
  const { status } = useSession();
  const authed = status === "authenticated";
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-sand/80 bg-cream/85 backdrop-blur-md">
      <div className="mx-auto grid h-16 w-full max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-ink transition-opacity duration-200 hover:opacity-80"
          aria-label="ClearLens home"
        >
          <Logo />
        </Link>

        {/* Centered primary nav (desktop) */}
        <nav className="hidden justify-self-center md:block" aria-label="Primary">
          <ul className="flex items-center gap-7">
            {NAV_LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative py-2 text-sm font-medium transition-colors duration-200 after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-maroon after:transition-transform after:duration-200 ${
                      active
                        ? "text-ink after:scale-x-100"
                        : "text-clay after:scale-x-0 hover:text-ink hover:after:scale-x-100"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Session actions (desktop) */}
        <div className="hidden items-center gap-2 justify-self-end md:flex">
          {authed ? (
            <Link href="/dashboard" className="btn-pill btn-pill-primary px-5 py-2.5">
              Open workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-2 text-sm font-medium text-clay transition-colors duration-200 hover:text-ink"
              >
                Sign in
              </Link>
              <Link href="/signup" className="btn-pill btn-pill-primary group px-5 py-2.5">
                Get started
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          className="inline-grid h-10 w-10 place-content-center justify-self-end rounded-full border border-sand bg-white/70 text-ink transition-colors duration-200 hover:bg-white md:hidden"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="border-t border-sand/80 bg-cream px-4 pt-2 pb-5 md:hidden" aria-label="Mobile">
          <ul>
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={closeMenu}
                  aria-current={isActive(pathname, link.href) ? "page" : undefined}
                  className={`block border-b border-sand/60 px-1 py-3 text-sm font-medium transition-colors ${
                    isActive(pathname, link.href) ? "text-maroon" : "text-clay hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex items-center gap-3">
            {authed ? (
              <Link
                href="/dashboard"
                onClick={closeMenu}
                className="btn-pill btn-pill-primary flex-1 py-2.5"
              >
                Open workspace
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="flex-1 rounded-full border border-sand bg-white/70 px-4 py-2.5 text-center text-sm font-semibold text-ink transition-colors duration-200 hover:bg-white"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  onClick={closeMenu}
                  className="btn-pill btn-pill-primary flex-1 py-2.5"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}