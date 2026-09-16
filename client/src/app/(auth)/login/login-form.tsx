"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { useSession } from "@/components/providers/SessionProvider";
import { Notice } from "@/components/ui/Notice";
import { ApiError, authApi } from "@/lib/api";

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export default function LoginForm() {
  const { status, setUser } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/studio";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in — skip the form.
  useEffect(() => {
    if (status === "authenticated") router.replace("/studio");
  }, [status, router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);

    const errors: typeof fieldErrors = {};
    if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Enter a valid email address.";
    if (password.length < 6) errors.password = "Passwords are at least 6 characters.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const user = await authApi.login({ email: email.trim(), password });
      setUser(user);
      router.replace(next.startsWith("/") ? next : "/studio");
    } catch (err) {
      setServerError(
        err instanceof ApiError ? err.message : "Could not sign in. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="animate-fade-up card-luxe p-6 sm:p-8">
      <h1 className="font-display text-2xl font-semibold tracking-[0.01em] text-ink">
        Sign in to ClearLens
      </h1>
      <p className="mt-1.5 text-sm text-base-content/60">
        Access the de-hazing workspace with your account.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            className={`input w-full bg-base-100 ${fieldErrors.email ? "input-error" : ""}`}
            aria-invalid={Boolean(fieldErrors.email)}
          />
          {fieldErrors.email && <p className="mt-1.5 text-xs text-error">{fieldErrors.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            className={`input w-full bg-base-100 ${fieldErrors.password ? "input-error" : ""}`}
            aria-invalid={Boolean(fieldErrors.password)}
          />
          {fieldErrors.password && (
            <p className="mt-1.5 text-xs text-error">{fieldErrors.password}</p>
          )}
        </div>

        {serverError && <Notice variant="error">{serverError}</Notice>}

        <button
          type="submit"
          disabled={submitting}
          className="btn-pill btn-pill-primary mt-2 w-full py-3 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-base-content/60">
        New to ClearLens?{" "}
        <Link
          href="/signup"
          className="font-medium text-maroon underline underline-offset-2 transition-colors duration-200 hover:text-maroon-deep"
        >
          Create an account
        </Link>
      </p>
    </section>
  );
}