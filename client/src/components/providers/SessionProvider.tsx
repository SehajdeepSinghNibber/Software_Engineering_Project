"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { authApi, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";

export type SessionStatus = "loading" | "authenticated" | "unauthenticated";

type SessionContextValue = {
  status: SessionStatus;
  user: User | null;
  setUser: (user: User) => void;
  /** Re-validate the JWT cookie against the backend. */
  refresh: () => Promise<User | null>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

/** One round-trip to the backend. Any ApiError (401, 500…) resolves to null. */
async function fetchCurrentUser(): Promise<User | null> {
  try {
    return await authApi.check();
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [user, setUserState] = useState<User | null>(null);

  const refresh = useCallback(async (): Promise<User | null> => {
    try {
      const user = await fetchCurrentUser();
      setUserState(user);
      setStatus(user ? "authenticated" : "unauthenticated");
      return user;
    } catch (err) {
      // Non-HTTP failure (offline, DNS…) — treat like a signed-out state.
      console.error("Session check failed:", err);
      setUserState(null);
      setStatus("unauthenticated");
      return null;
    }
  }, []);

  const setUser = useCallback((next: User) => {
    setUserState(next);
    setStatus("authenticated");
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.signout();
    } finally {
      setUserState(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    void (async () => {
      try {
        const user = await fetchCurrentUser();
        if (ignore) return;
        setUserState(user);
        setStatus(user ? "authenticated" : "unauthenticated");
      } catch (err) {
        if (ignore) return;
        console.error("Session check failed:", err);
        setUserState(null);
        setStatus("unauthenticated");
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const value = useMemo(
    () => ({ status, user, setUser, refresh, signOut }),
    [status, user, setUser, refresh, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>.");
  return ctx;
}