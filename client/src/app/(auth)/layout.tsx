import type { ReactNode } from "react";

import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteNav } from "@/components/marketing/SiteNav";

/** Shared chrome for the sign-in / sign-up screens — same nav and footer as the marketing site. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <SiteNav />
      <main className="flex flex-1 items-start justify-center px-4 pt-10 pb-20 sm:pt-14">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}