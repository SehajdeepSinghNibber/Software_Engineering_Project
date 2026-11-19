"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Boxes,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  ScanLine,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";

import { useSession } from "@/components/providers/SessionProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Logo, LogoMark } from "@/components/ui/Logo";
import type { User } from "@/lib/types";

const NAV_GROUPS: {
  label: string;
  items: { href: string; label: string; icon: LucideIcon }[];
}[] = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/studio", label: "Studio", icon: ScanLine },
      { href: "/models", label: "Models", icon: Boxes },
    ],
  },
  {
    label: "Account",
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarContents({
  pathname,
  user,
  onNavigate,
  onSignOut,
}: {
  pathname: string;
  user: User | null;
  onNavigate: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="flex items-center gap-3 px-5 py-6 text-white transition-opacity hover:opacity-90"
        aria-label="ClearLens dashboard"
      >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-white">
          <LogoMark className="h-6 w-6" />
        </span>
        <span className="min-w-0">
          <span className="block text-[1.05rem] font-semibold tracking-[-0.035em]">ClearLens</span>
          <span className="mt-0.5 block text-[0.625rem] font-medium uppercase tracking-[0.12em] text-white/55">
            Image workspace
          </span>
        </span>
      </Link>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-5 pt-2" aria-label="Workspace">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-7 last:mb-0">
            <p className="app-sidebar-summary mb-2 px-3 text-[0.625rem] font-semibold uppercase tracking-[0.13em]">
              {group.label}
            </p>
            <ul className="space-y-1">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className="app-sidebar-link flex min-h-10 items-center gap-3 rounded-lg px-3 text-[0.8125rem] font-medium"
                    >
                      <Icon className="h-[1.05rem] w-[1.05rem] shrink-0" strokeWidth={1.8} aria-hidden="true" />
                      <span>{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {user && (
        <div className="border-t border-white/10 p-3">
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-white/8 [&::-webkit-details-marker]:hidden">
              <Avatar user={user} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-white">{user.fullName}</span>
                <span className="mt-0.5 block truncate text-[0.6875rem] text-white/55">{user.email}</span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-white/45 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="absolute bottom-[calc(100%+0.5rem)] left-0 right-0 z-50 rounded-xl border border-white/10 bg-[#0b3d2d] p-1.5 shadow-xl shadow-black/20">
              <p className="truncate px-3 py-2 text-[0.6875rem] text-white/55">Signed in as {user.email}</p>
              <button
                type="button"
                onClick={onSignOut}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                Sign out
              </button>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

/** Authenticated workspace chrome with a responsive, persistent navigation rail. */
export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const handleSignOut = async () => {
    closeMenu();
    await signOut();
    router.replace("/login");
  };

  return (
    <div className="flex min-h-dvh bg-base-100 text-ink">
      <aside className="app-sidebar sticky top-0 hidden h-dvh w-[15.5rem] shrink-0 md:block" aria-label="Workspace navigation">
        <SidebarContents pathname={pathname} user={user} onNavigate={closeMenu} onSignOut={() => void handleSignOut()} />
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[3.875rem] items-center justify-between border-b border-base-300/75 bg-base-100/95 px-4 backdrop-blur-sm md:hidden">
          <button
            type="button"
            className="-ml-2 grid h-10 w-10 place-items-center rounded-lg text-base-content/70 transition-colors hover:bg-base-200 hover:text-base-content"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link href="/dashboard" className="text-ink" aria-label="ClearLens dashboard">
            <Logo />
          </Link>
          <span className="w-8" aria-hidden="true" />
        </header>

        <div
          className="app-mobile-drawer fixed inset-0 z-50 transition-opacity duration-200 md:hidden"
          data-open={menuOpen}
          aria-hidden={!menuOpen}
          inert={!menuOpen}
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#0b1711]/45"
            aria-label="Close navigation menu"
            onClick={closeMenu}
          />
          <aside className="app-sidebar app-mobile-drawer-panel relative z-10 h-dvh w-[min(17.5rem,86vw)] shadow-2xl shadow-black/20" aria-label="Workspace navigation">
            <SidebarContents pathname={pathname} user={user} onNavigate={closeMenu} onSignOut={() => void handleSignOut()} />
          </aside>
        </div>

        <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-7 sm:px-6 sm:py-8 lg:px-10 lg:py-10 xl:px-12">
          {children}
        </main>
      </div>
    </div>
  );
}
