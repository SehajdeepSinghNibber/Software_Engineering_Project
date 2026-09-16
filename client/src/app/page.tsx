"use client";

import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  Crop,
  Cpu,
  Feather,
  Focus,
  Image as ImageIcon,
  Images,
  Layers,
  ShieldCheck,
  Upload,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";

import { CompareShowcase } from "@/components/marketing/CompareShowcase";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteNav } from "@/components/marketing/SiteNav";
import { useSession } from "@/components/providers/SessionProvider";
import { Notice } from "@/components/ui/Notice";
import { useModels } from "@/hooks/useModels";

const FEATURE_CALLOUTS = [
  { icon: ImageIcon, label: "JPG, PNG supported", caption: "Up to 10 MB per frame" },
  { icon: Zap, label: "Fast API response", caption: "Milliseconds per frame" },
  { icon: ShieldCheck, label: "Your images are not stored", caption: "Processed in memory only" },
] as const;

const PIPELINE_STEPS = [
  {
    icon: Upload,
    step: "01",
    title: "Upload",
    body: "A hazy photograph is posted to the authenticated de-haze endpoint.",
  },
  {
    icon: Crop,
    step: "02",
    title: "Preprocess",
    body: "Aspect-preserving letterbox resize and per-model normalisation.",
  },
  {
    icon: Cpu,
    step: "03",
    title: "Inference",
    body: "A PyTorch architecture estimates and removes the haze.",
  },
  {
    icon: Images,
    step: "04",
    title: "Review",
    body: "Compare hazy vs. de-hazed side by side and download the result.",
  },
] as const;

const MODEL_ICONS = { dehamer: Layers, aod: Focus, light_dehaze: Feather } as const;

/** Auth-aware primary call to action — straight into the Studio for signed-in users. */
function WorkspaceLink({ className, children }: { className: string; children: ReactNode }) {
  const { status } = useSession();
  return (
    <Link href={status === "authenticated" ? "/studio" : "/signup"} className={className}>
      {children}
    </Link>
  );
}

/** Live model catalog, served from GET /api/v1/ml/models. */
function ModelCatalog() {
  const { models, loading, error } = useModels();

  return (
    <div>
      <div className="max-w-2xl">
        <p className="badge-pill">
          <span className="badge-pill-dot" aria-hidden="true" />
          Model catalog
        </p>
        <h2 className="mt-4 font-display text-3xl leading-tight tracking-[0.01em] text-ink sm:text-4xl">
          Three architectures, one pipeline
        </h2>
        <p className="mt-3 text-base leading-relaxed text-clay">
          The inference service loads each model on demand — the catalog below is served live from
          the API.
        </p>
      </div>

      {loading && (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="skeleton h-44 rounded-2xl" />
          ))}
        </div>
      )}

      {!loading && models && (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((model) => {
            const Icon = MODEL_ICONS[model.name as keyof typeof MODEL_ICONS] ?? Layers;
            return (
              <article
                key={model.name}
                className="card-luxe flex flex-col p-6 transition-shadow duration-200 hover:shadow-lift"
              >
                <span className="inline-grid h-10 w-10 place-content-center rounded-xl border border-sand bg-parchment text-maroon">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <p className="mt-4 font-mono text-xs uppercase tracking-[0.08em] text-clay">
                  {model.name}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-base-content/80">
                  {model.description}
                </p>
                <p className="mt-auto pt-4 font-mono text-[0.6875rem] text-clay/70">
                  {model.defaultSize}px default · {model.device} · {model.weightsState}
                </p>
              </article>
            );
          })}
        </div>
      )}

      {!loading && !models && (
        <Notice variant="warning" title="Model catalog is unavailable right now." className="mt-10">
          {error ?? "The inference service may be offline. Try refreshing the page."}
        </Notice>
      )}
    </div>
  );
}

/** Marketing landing page. */
export default function LandingPage() {
  const { status } = useSession();
  const authed = status === "authenticated";

  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <SiteNav />

      <main className="flex-1">
        {/* ——— Hero ——— */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(65%_55%_at_50%_0%,rgb(247_237_221)_0%,transparent_100%)]"
          />
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-4 pt-12 pb-20 sm:px-6 sm:pt-16 sm:pb-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-8 lg:pt-20 lg:pb-28">
            <div className="animate-fade-up">
              <p className="badge-pill">
                <span className="badge-pill-dot" aria-hidden="true" />
                Image de-hazing · Powered by research-grade AI
              </p>
              <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.06] tracking-[0.01em] text-ink sm:text-6xl lg:text-[4.25rem]">
                See through
                <br />
                the haze.
              </h1>
              <p className="mt-6 max-w-lg text-base leading-[1.75] text-clay sm:text-lg">
                ClearLens restores visibility in degraded imagery. Upload a hazy photograph and
                compare it against a de-hazed result produced by research-grade models — Dehamer,
                AOD-Net and Light-DehazeNet.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
                <WorkspaceLink className="btn-pill btn-pill-primary group px-7 py-3.5">
                  {authed ? "Open the Studio" : "Start de-hazing"}
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </WorkspaceLink>
                <a href="#pipeline" className="link-chevron group">
                  How it works
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 group-hover:translate-y-0.5" />
                </a>
              </div>
              <div className="mt-12 grid max-w-lg grid-cols-1 gap-6 border-t border-sand/90 pt-8 sm:grid-cols-3">
                {FEATURE_CALLOUTS.map(({ icon: Icon, label, caption }) => (
                  <div key={label}>
                    <span className="inline-grid h-10 w-10 place-content-center rounded-xl border border-sand bg-white/80 text-maroon shadow-sm">
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                    </span>
                    <p className="mt-3 text-sm font-semibold text-ink">{label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-clay">{caption}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="animate-fade-up mx-auto w-full max-w-md lg:max-w-none">
              <CompareShowcase />
            </div>
          </div>
        </section>

        {/* ——— Pipeline ——— */}
        <section id="pipeline" className="scroll-mt-20 border-y border-sand/80 bg-parchment/60">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="max-w-2xl">
              <p className="badge-pill">
                <span className="badge-pill-dot" aria-hidden="true" />
                Pipeline
              </p>
              <h2 className="mt-4 font-display text-3xl leading-tight tracking-[0.01em] text-ink sm:text-4xl">
                From upload to insight
              </h2>
              <p className="mt-3 text-base leading-relaxed text-clay">
                Every run follows the same measured path through the platform.
              </p>
            </div>
            <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {PIPELINE_STEPS.map(({ icon: Icon, step, title, body }) => (
                <li key={step} className="card-luxe p-6">
                  <div className="flex items-center justify-between">
                    <span className="inline-grid h-10 w-10 place-content-center rounded-xl border border-sand bg-parchment text-maroon">
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                    </span>
                    <span className="font-display text-xl text-maroon/50">{step}</span>
                  </div>
                  <p className="mt-4 text-sm font-semibold text-ink">{title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-clay">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ——— Models ——— */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <ModelCatalog />
        </section>

        {/* ——— Closing CTA ——— */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 sm:pb-24 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-maroon px-6 py-14 text-center shadow-lift sm:px-10 sm:py-16">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_120%,rgb(69_19_10)_0%,transparent_100%)]"
            />
            <div className="relative">
              <h2 className="font-display text-3xl leading-tight tracking-[0.01em] text-cream sm:text-4xl">
                Ready to clear the air?
              </h2>
              <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-cream/75">
                Create an account and run your first de-haze in under a minute.
              </p>
              <WorkspaceLink className="btn-pill btn-pill-inverse group mt-8 px-7 py-3.5">
                {authed ? "Open the Studio" : "Create your account"}
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </WorkspaceLink>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}