"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useSession } from "@/components/providers/SessionProvider";
import { Logo } from "@/components/ui/Logo";
import { Notice } from "@/components/ui/Notice";
import { useModels } from "@/hooks/useModels";

const PIPELINE_STEPS = [
  {
    step: "01",
    title: "Upload",
    body: "A hazy photograph is posted to the authenticated de-haze endpoint.",
  },
  {
    step: "02",
    title: "Preprocess",
    body: "Aspect-preserving letterbox resize and per-model normalisation.",
  },
  {
    step: "03",
    title: "Inference",
    body: "A PyTorch architecture estimates and removes the haze.",
  },
  {
    step: "04",
    title: "Review",
    body: "Compare hazy vs. de-hazed side by side and download the PNG.",
  },
] as const;

/** Auth-aware CTA target for the landing page. */
function WorkspaceLink({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  const { status } = useSession();
  return (
    <Link href={status === "authenticated" ? "/studio" : "/signup"} className={className}>
      {children}
    </Link>
  );
}

function HazeScene() {
  return (
    <figure className="relative w-full overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-sm">
      <svg viewBox="0 0 480 340" className="block w-full" role="img" aria-label="Illustration of a landscape before and after de-hazing">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f3e8d6" />
            <stop offset="55%" stopColor="#e6cdb0" />
            <stop offset="100%" stopColor="#d3ac86" />
          </linearGradient>
          <linearGradient id="hillBack" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b3906c" />
            <stop offset="100%" stopColor="#a37f5e" />
          </linearGradient>
          <linearGradient id="hillFront" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7d5c42" />
            <stop offset="100%" stopColor="#6b4c36" />
          </linearGradient>
          <clipPath id="hazeSide">
            <rect x="0" y="0" width="240" height="340" />
          </clipPath>
          <filter id="hazeBlur" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <g id="scene">
            <rect width="480" height="340" fill="url(#sky)" />
            <circle cx="330" cy="96" r="34" fill="#f8ecd8" opacity="0.9" />
            <path d="M0 236 L96 150 L170 214 L262 118 L352 208 L420 156 L480 214 L480 340 L0 340 Z" fill="url(#hillBack)" opacity="0.75" />
            <path d="M0 288 L120 224 L232 276 L338 218 L440 272 L480 250 L480 340 L0 340 Z" fill="url(#hillFront)" />
          </g>
        </defs>

        {/* Clear scene (base layer) */}
        <use href="#scene" />

        {/* Hazy scene: same geometry, blurred and veiled, clipped to the left */}
        <g clipPath="url(#hazeSide)">
          <use href="#scene" filter="url(#hazeBlur)" />
          <rect x="0" y="0" width="240" height="340" fill="#f6ead8" opacity="0.55" />
        </g>

        <line x1="240" y1="0" x2="240" y2="340" stroke="#ffffff" strokeWidth="2" opacity="0.9" />
      </svg>

      <span className="absolute left-3 top-3 rounded-full border border-white/40 bg-black/40 px-2.5 py-0.5 text-[0.6875rem] font-medium tracking-wide text-white backdrop-blur">
        Hazy
      </span>
      <span className="absolute right-3 top-3 rounded-full border border-white/40 bg-black/40 px-2.5 py-0.5 text-[0.6875rem] font-medium tracking-wide text-white backdrop-blur">
        Clear
      </span>
      <figcaption className="border-t border-base-300/70 px-4 py-2.5 text-xs text-base-content/50">
        Dehamer restores scene radiance from a single hazy frame.
      </figcaption>
    </figure>
  );
}

function ModelCatalog() {
  const { models, loading, error } = useModels();

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Three architectures, one pipeline
          </h2>
          <p className="mt-1 text-sm text-base-content/60">
            The inference service loads each model on demand — the catalog below
            is served live from the API.
          </p>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-20 w-full" />
          ))}
        </div>
      )}

      {!loading && models && (
        <ul className="divide-y divide-base-300/70 rounded-box border border-base-300/70 bg-base-100">
          {models.map((model) => (
            <li key={model.name} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <div className="min-w-0">
                <p className="font-mono text-sm font-medium">{model.name}</p>
                <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-base-content/55">
                  {model.description}
                </p>
              </div>
              <p className="shrink-0 font-mono text-[0.6875rem] text-base-content/45">
                {model.defaultSize}px default · {model.device} · {model.weightsState}
              </p>
            </li>
          ))}
        </ul>
      )}

      {!loading && !models && (
        <Notice variant="warning" title="Model catalog is unavailable right now.">
          {error} You can still sign in — the catalog will load once the
          inference service is reachable.
        </Notice>
      )}
    </div>
  );
}

export default function LandingPage() {
  const { status } = useSession();
  const authed = status === "authenticated";

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="border-b border-base-300/60">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-base-content transition-opacity hover:opacity-80">
            <Logo />
          </Link>
          <nav className="flex items-center gap-2">
            {authed ? (
              <Link href="/dashboard" className="btn btn-sm">
                Open workspace
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn btn-ghost btn-sm">
                  Sign in
                </Link>
                <Link href="/signup" className="btn btn-primary btn-sm">
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-dotgrid">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-100 px-3 py-1 text-xs font-medium text-base-content/70">
              <span className="h-1.5 w-1.5 rounded-full bg-base-content" aria-hidden="true" />
              Image de-hazing · served through a production API
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              See through
              <br />
              the haze.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-base-content/65 sm:text-lg">
              ClearLens restores visibility in degraded imagery. Upload a hazy
              photograph and compare it against a de-hazed result produced by
              research-grade models — Dehamer, AOD-Net and Light-DehazeNet.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <WorkspaceLink className="btn btn-primary">
                {authed ? "Open the Studio" : "Start de-hazing"}
              </WorkspaceLink>
              <a href="#pipeline" className="btn btn-ghost">
                How it works
              </a>
            </div>
            <p className="mt-6 font-mono text-xs text-base-content/45">
              JWT-protected API · PNG in, PNG out · response times in milliseconds
            </p>
          </div>

          <div className="animate-fade-up lg:justify-self-end lg:w-full lg:max-w-xl">
            <HazeScene />
          </div>
        </div>
      </section>

      {/* Pipeline */}
      <section id="pipeline" className="border-y border-base-300/60 bg-base-200/60">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            From upload to insight
          </h2>
          <p className="mt-1 text-sm text-base-content/60">
            Every run follows the same measured path through the platform.
          </p>
          <ol className="mt-8 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {PIPELINE_STEPS.map((step) => (
              <li key={step.step} className="border-t-2 border-base-300 pt-4">
                <p className="font-mono text-xs text-base-content/45">{step.step}</p>
                <p className="mt-2 text-sm font-semibold tracking-tight">{step.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-base-content/55">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Live model catalog */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <ModelCatalog />
      </section>

      {/* Closing CTA */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="rounded-box bg-base-content px-6 py-10 text-center sm:px-10 lg:py-12">
          <h2 className="text-xl font-semibold tracking-tight text-base-100 sm:text-2xl">
            Ready to clear the air?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-base-100/70">
            Create an account and run your first de-haze in under a minute.
          </p>
          <WorkspaceLink className="btn btn-primary btn-sm mt-6 border-base-100 bg-base-100 text-base-content hover:border-base-100 hover:bg-base-200">
            {authed ? "Open the Studio" : "Create your account"}
          </WorkspaceLink>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-base-300/60">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-base-content/50 sm:px-6 lg:px-8">
          <p>ClearLens — Image De-hazing Platform</p>
          <p>Software Engineering Project</p>
        </div>
      </footer>
    </div>
  );
}