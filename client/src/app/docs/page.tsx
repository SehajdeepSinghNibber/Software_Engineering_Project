import { Braces, KeyRound } from "lucide-react";

import { CtaBand } from "@/components/marketing/CtaBand";
import { PageHero } from "@/components/marketing/PageHero";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteNav } from "@/components/marketing/SiteNav";

const AUTH_ENDPOINTS = [
  { method: "POST", path: "/api/v1/auth/signup", note: "Create an account (name, email, password)" },
  { method: "POST", path: "/api/v1/auth/login", note: "Exchange credentials for a session cookie" },
  { method: "POST", path: "/api/v1/auth/signout", note: "Clear the session cookie" },
  { method: "GET", path: "/api/v1/auth/check", note: "Resolve the current user from the cookie" },
  { method: "PATCH", path: "/api/v1/auth/update-profile", note: "Update profile details" },
] as const;

const ML_ENDPOINTS = [
  {
    method: "GET",
    path: "/api/v1/ml/models",
    note: "List the available architectures, their input ranges and weights state",
  },
  {
    method: "POST",
    path: "/api/v1/ml/dehaze",
    note: "Multipart upload: image field + optional model and size — returns a de-hazed PNG",
  },
] as const;

const TABLE_HEAD = "border-b border-sand pb-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-clay";
const TABLE_CELL = "border-b border-sand/60 py-3 pr-4 align-top text-sm";

export default function DocsPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <SiteNav />

      <main className="flex-1">
        <PageHero
          eyebrow="Docs"
          title="The ClearLens API, in plain terms."
          lede="Everything runs through the Fastify API under /api/v1 — JSON Web Token sessions for people, multipart uploads for images. No API keys, no dashboard required."
        />

        {/* ——— Quickstart ——— */}
        <section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="card-luxe p-7 sm:p-9">
            <div className="flex items-center gap-3">
              <span className="inline-grid h-10 w-10 place-content-center rounded-xl border border-sand bg-parchment text-maroon">
                <Braces className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <h2 className="font-display text-2xl tracking-[0.01em] text-ink">Quickstart</h2>
            </div>
            <ol className="mt-6 space-y-5">
              {[
                {
                  title: "Create an account",
                  body: "POST /api/v1/auth/signup with a full name, email and password (at least 6 characters).",
                },
                {
                  title: "Sign in",
                  body: "POST /api/v1/auth/login sets an httpOnly JWT cookie — the browser handles it from then on.",
                },
                {
                  title: "De-haze an image",
                  body: "Upload through the Studio, or POST a multipart form to /api/v1/ml/dehaze with your image attached.",
                },
              ].map(({ title, body }, index) => (
                <li key={title} className="flex gap-4">
                  <span className="mt-0.5 inline-grid h-7 w-7 shrink-0 place-content-center rounded-full bg-maroon font-mono text-xs text-cream">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink">{title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-clay">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ——— Authentication ——— */}
        <section className="mx-auto w-full max-w-4xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="inline-grid h-10 w-10 place-content-center rounded-xl border border-sand bg-parchment text-maroon">
              <KeyRound className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <h2 className="font-display text-2xl tracking-[0.01em] text-ink">Authentication</h2>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-clay">
            Passwords are hashed with bcrypt and never leave the server. A successful login sets a
            7-day, httpOnly, sameSite=strict cookie named{" "}
            <span className="font-mono text-ink">jwt</span> — every{" "}
            <span className="font-mono text-ink">/api/v1/ml</span> request requires it.
          </p>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left">
              <thead>
                <tr>
                  <th className={TABLE_HEAD}>Method</th>
                  <th className={TABLE_HEAD}>Endpoint</th>
                  <th className={TABLE_HEAD}>Purpose</th>
                </tr>
              </thead>
              <tbody>
                {AUTH_ENDPOINTS.map((endpoint) => (
                  <tr key={endpoint.path}>
                    <td className={`${TABLE_CELL} font-mono text-xs font-semibold text-maroon`}>
                      {endpoint.method}
                    </td>
                    <td className={`${TABLE_CELL} font-mono text-[0.8125rem] text-ink`}>
                      {endpoint.path}
                    </td>
                    <td className={`${TABLE_CELL} text-clay`}>{endpoint.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        {/* ——— De-hazing ——— */}
        <section className="mx-auto w-full max-w-4xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="inline-grid h-10 w-10 place-content-center rounded-xl border border-sand bg-parchment text-maroon">
              <Braces className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <h2 className="font-display text-2xl tracking-[0.01em] text-ink">Image de-hazing</h2>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-clay">
            Both machine-learning endpoints sit behind the same session cookie.{" "}
            <span className="font-mono text-ink">dehaze</span> accepts JPEG or PNG up to 10 MB,
            processes the frame in memory, and streams back a PNG — your image is never written to
            disk.
          </p>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left">
              <thead>
                <tr>
                  <th className={TABLE_HEAD}>Method</th>
                  <th className={TABLE_HEAD}>Endpoint</th>
                  <th className={TABLE_HEAD}>Purpose</th>
                </tr>
              </thead>
              <tbody>
                {ML_ENDPOINTS.map((endpoint) => (
                  <tr key={endpoint.path}>
                    <td className={`${TABLE_CELL} font-mono text-xs font-semibold text-maroon`}>
                      {endpoint.method}
                    </td>
                    <td className={`${TABLE_CELL} font-mono text-[0.8125rem] text-ink`}>
                      {endpoint.path}
                    </td>
                    <td className={`${TABLE_CELL} text-clay`}>{endpoint.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Response fields */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="card-luxe p-6">
              <p className="text-sm font-semibold text-ink">What comes back</p>
              <p className="mt-2 text-sm leading-relaxed text-clay">
                The result includes the de-hazed image as a data URL, the model that ran, real
                inference timing, input and output dimensions, and a{" "}
                <span className="font-mono text-ink">weightsState</span> flag disclosing whether
                trained or bundled weights produced it.
              </p>
            </div>
            <div className="card-luxe p-6">
              <p className="text-sm font-semibold text-ink">Errors, honestly</p>
              <p className="mt-2 text-sm leading-relaxed text-clay">
                Validation problems return <span className="font-mono text-ink">400</span> with a
                human-readable message, a missing or expired session returns{" "}
                <span className="font-mono text-ink">401</span>, and an offline inference service
                returns <span className="font-mono text-ink">503</span> — never a silent failure.
              </p>
            </div>
          </div>
        </section>

        <CtaBand
          title="Try it without writing a line."
          body="The Studio wraps this exact API — sign up and de-haze your first frame in under a minute."
          href="/signup"
          label="Open the Studio"
        />
      </main>

      <SiteFooter />
    </div>
  );
}
