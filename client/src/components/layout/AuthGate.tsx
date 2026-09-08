"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useSession } from "@/components/providers/SessionProvider";
import { CenteredLoader } from "@/components/ui/Spinner";

/**
 * Client-side route guard for the authenticated area. The JWT cookie is only
 * truly validated server-side; this gate keeps unauthenticated visitors on the
 * auth screens by checking the real session endpoint before rendering.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [status, router, pathname]);

  if (status !== "authenticated") {
    return <CenteredLoader label={status === "loading" ? "Checking your session…" : "Redirecting to sign in…"} />;
  }

  return <>{children}</>;
}