"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { useSession } from "@/components/providers/SessionProvider";
import { Notice } from "@/components/ui/Notice";
import { ApiError, authApi } from "@/lib/api";

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export default function SignupPage() {
  const { status, setUser } = useSession();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
  }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/studio");
  }, [status, router]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);

    const errors: typeof fieldErrors = {};
    if (fullName.trim().length < 2) errors.fullName = "Enter your full name.";
    if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Enter a valid email address.";
    if (password.length < 6) errors.password = "Use at least 6 characters.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const user = await authApi.signup({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      });
      setUser(user);
      router.replace("/studio");
    } catch (err) {
      setServerError(
        err instanceof ApiError ? err.message : "Could not create the account. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="animate-fade-up card-luxe p-6 sm:p-8">
      <h1 className="font-display text-2xl font-semibold tracking-[0.01em] text-ink">
        Create your account
      </h1>
      <p className="mt-1.5 text-sm text-base-content/60">
        One account for the whole de-hazing workspace.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <div>
          <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium">
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Ada Lovelace"
            className={`input w-full bg-base-100 ${fieldErrors.fullName ? "input-error" : ""}`}
            aria-invalid={Boolean(fieldErrors.fullName)}
          />
          {fieldErrors.fullName && (
            <p className="mt-1.5 text-xs text-error">{fieldErrors.fullName}</p>
          )}
        </div>

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
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 6 characters"
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
              Creating account…
            </>
          ) : (
            "Create account"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-base-content/60">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-maroon underline underline-offset-2 transition-colors duration-200 hover:text-maroon-deep"
        >
          Sign in
        </Link>
      </p>
    </section>
  );
}