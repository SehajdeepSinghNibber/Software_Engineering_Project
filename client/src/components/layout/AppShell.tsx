"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { useSession } from "@/components/providers/SessionProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Logo } from "@/components/ui/Logo";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/studio", label: "Studio" },
  { href: "/models", label: "Models" },
] as const;

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Authenticated application chrome: navbar, mobile menu, footer. */
export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-base-300/60 bg-base-100/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-base-content transition-opacity hover:opacity-80">
              <Logo />
            </Link>

            <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(pathname, item.href) ? "page" : undefined}
                  className={`rounded-field px-3 py-2 text-sm font-medium transition-colors ${
                    isActive(pathname, item.href)
                      ? "bg-base-200 text-base-content"
                      : "text-base-content/60 hover:bg-base-200/60 hover:text-base-content"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {user && (
            <div className="flex items-center gap-2">
              <div className="dropdown dropdown-end">
                <button
                  type="button"
                  className="flex items-center gap-2.5 rounded-full border border-transparent p-1 pr-2 transition-colors hover:border-base-300 hover:bg-base-200/60"
                  aria-label="Account menu"
                >
                  <Avatar user={user} size="sm" />
                  <span className="hidden max-w-40 truncate text-sm font-medium sm:block">
                    {user.fullName}
                  </span>
                </button>
                <ul className="menu dropdown-content z-50 mt-2 w-56 rounded-box border border-base-300/70 bg-base-100 p-1.5 shadow-sm">
                  <li className="menu-title px-3 pb-1 pt-2 text-xs normal-case">
                    <span className="block truncate">{user.email}</span>
                  </li>
                  <li>
                    <Link href="/settings">Settings</Link>
                  </li>
                  <li>
                    <button type="button" onClick={handleSignOut}>
                      Sign out
                    </button>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                className="btn btn-ghost btn-sm btn-square md:hidden"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
                  {menuOpen ? (
                    <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                  ) : (
                    <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                  )}
                </svg>
              </button>
            </div>
          )}
        </div>

        {menuOpen && (
          <nav className="border-t border-base-300/60 bg-base-100 px-4 py-2 md:hidden" aria-label="Mobile">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className={`block rounded-field px-3 py-2.5 text-sm font-medium ${
                  isActive(pathname, item.href)
                    ? "bg-base-200 text-base-content"
                    : "text-base-content/60 hover:bg-base-200/60"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {children}
      </main>

      <footer className="border-t border-base-300/60">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-base-content/50 sm:px-6 lg:px-8">
          <p>ClearLens — Image De-hazing Platform</p>
          <p>Dehamer · AOD-Net · Light-DehazeNet, served via a PyTorch inference pipeline</p>
        </div>
      </footer>
    </div>
  );
}