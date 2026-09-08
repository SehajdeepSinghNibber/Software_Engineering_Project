import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/ui/Logo";

/** Shared chrome for the sign-in / sign-up screens. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-dotgrid">
      <header className="px-4 py-5 sm:px-6">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="inline-flex text-base-content transition-opacity hover:opacity-80">
            <Logo />
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-4 sm:pt-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="px-4 pb-6 text-center text-xs text-base-content/45">
        Protected by JWT session cookies · ClearLens
      </footer>
    </div>
  );
}