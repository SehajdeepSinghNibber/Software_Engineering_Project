"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowRight,
  Eye,
  FileImage,
  FlaskConical,
  Layers3,
  Mountain,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Upload,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteNav } from "@/components/marketing/SiteNav";
import { useSession } from "@/components/providers/SessionProvider";
import { Notice } from "@/components/ui/Notice";
import { useModels } from "@/hooks/useModels";
import type { ModelInfo } from "@/lib/types";

const CompareShowcase = dynamic(
  () => import("@/components/marketing/CompareShowcase").then((module) => module.CompareShowcase),
  {
    ssr: false,
    loading: () => (
      <div className="relative aspect-[1.58] w-full overflow-hidden rounded-2xl border border-sand shadow-lift" role="img" aria-label="Example comparison of a hazy and restored mountain image">
        <Image src="/mountain-hazy.jpg" alt="" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" priority />
        <div className="absolute inset-y-0 right-0 w-1/2 overflow-hidden border-l-2 border-white">
          <div className="relative h-full w-[200%]">
            <Image src="/mountain-clear.jpg" alt="" fill sizes="(max-width: 1024px) 50vw, 25vw" className="object-cover" priority />
          </div>
        </div>
        <span className="absolute left-3 top-3 rounded-full border border-white/30 bg-ink/45 px-3 py-1 text-[0.6875rem] font-medium text-white backdrop-blur-sm">Original (Hazy)</span>
        <span className="absolute right-3 top-3 rounded-full border border-white/30 bg-cream/90 px-3 py-1 text-[0.6875rem] font-medium text-ink backdrop-blur-sm">ClearLens (Restored)</span>
        <span className="absolute inset-y-0 left-1/2 w-px bg-white/90" aria-hidden="true" />
      </div>
    ),
  },
);

const HERO_FEATURES: { icon: LucideIcon; label: string; caption: string }[] = [
  { icon: Eye, label: "Remove haze", caption: "Recover scene visibility" },
  { icon: Layers3, label: "Powered by DRNet", caption: "Research-grade restoration" },
  { icon: ScanLine, label: "Review results", caption: "See original and processed images" },
];

const PIPELINE_STEPS = [
  {
    icon: Upload,
    title: "Upload your image",
    body: "Add a JPEG or PNG photograph to the authenticated Studio.",
  },
  {
    icon: Layers3,
    title: "Select a model",
    body: "Run the pretrained DRNet dehazing model.",
  },
  {
    icon: ScanLine,
    title: "Preview and download",
    body: "Compare the result with your original, then download the PNG.",
  },
] as const;

const USE_CASES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Mountain,
    title: "Landscape photography",
    body: "Review distant terrain and atmospheric conditions in mountain and travel imagery.",
  },
  {
    icon: Eye,
    title: "Outdoor monitoring",
    body: "Inspect outdoor camera frames when haze reduces scene visibility.",
  },
  {
    icon: FileImage,
    title: "Traffic and road visibility",
    body: "Examine road scenes, signs, and lane markings in hazy conditions.",
  },
  {
    icon: FlaskConical,
    title: "Research and image analysis",
    body: "Compare restoration architectures through one consistent inference workflow.",
  },
];

const MODEL_ICONS: Record<string, LucideIcon> = {
  drnet: Layers3,
  dehamer: Layers3,
};

/** Auth-aware primary action routes people into the real Studio flow. */
function WorkspaceLink({ className, children }: { className: string; children: ReactNode }) {
  const { status } = useSession();
  return (
    <Link href={status === "authenticated" ? "/studio" : "/signup"} className={className}>
      {children}
    </Link>
  );
}

function MetricStrip({ models, loading }: { models: ModelInfo[] | null; loading: boolean }) {
  const modelCount = loading ? "…" : models ? String(models.length) : "—";
  const metrics = [
    { icon: Layers3, value: modelCount, label: "Available architectures" },
    { icon: FileImage, value: "JPEG · PNG", label: "Supported image formats" },
    { icon: Upload, value: "10 MB", label: "Default upload limit" },
    { icon: ShieldCheck, value: "In memory", label: "Server-side processing" },
  ] as const;

  return (
    <section aria-label="ClearLens platform details" className="relative z-10 mx-auto -mt-1 w-full max-w-6xl px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-2 divide-x divide-y divide-sand overflow-hidden rounded-xl border border-sand bg-white shadow-card sm:grid-cols-4 sm:divide-y-0">
        {metrics.map(({ icon: Icon, value, label }) => (
          <div key={label} className="flex min-h-[5.25rem] items-center gap-3 px-4 py-3.5 sm:px-5 lg:gap-4 lg:px-6">
            <Icon className="h-5 w-5 shrink-0 text-maroon" strokeWidth={1.8} aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-lg">{value}</p>
              <p className="mt-1 text-[0.625rem] leading-snug text-clay sm:text-xs">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ModelCatalog({
  models,
  loading,
  error,
  onRetry,
}: {
  models: ModelInfo[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <section id="models" className="scroll-mt-24 bg-base-200/60">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-2xl">
          <p className="badge-pill">Available models</p>
          <h2 className="mt-4 font-display text-3xl leading-[1.12] tracking-[-0.035em] text-ink sm:text-4xl">
            Research architectures, one workflow.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-clay sm:text-base">
            The catalog is served by the inference API. Choose from the architectures available in your deployment.
          </p>
        </div>

        {loading && (
          <div className="mt-9 divide-y divide-sand border-y border-sand" aria-busy="true" aria-label="Loading model catalog">
            {[0, 1, 2].map((index) => <div key={index} className="skeleton my-4 h-16 w-full" />)}
          </div>
        )}

        {!loading && models && models.length > 0 && (
          <ul className="mt-9 divide-y divide-sand border-y border-sand">
            {models.map((model) => {
              const Icon = MODEL_ICONS[model.name] ?? Layers3;
              return (
                <li key={model.name} className="grid gap-3 py-5 sm:grid-cols-[minmax(10rem,0.65fr)_minmax(0,1.5fr)_auto] sm:items-center sm:gap-6">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-maroon">
                      <Icon className="h-[1.05rem] w-[1.05rem]" strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <h3 className="font-mono text-sm font-semibold text-ink">{model.name}</h3>
                  </div>
                  <p className="max-w-2xl text-sm leading-relaxed text-clay">{model.description}</p>
                  <span className={`w-fit rounded-full px-2.5 py-1 text-[0.6875rem] font-medium ${model.weightsState === "trained" ? "bg-secondary text-success" : model.weightsState === "partial" ? "bg-warning/10 text-warning" : "bg-base-100 text-clay"}`}>
                    {model.weightsState} weights
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {!loading && models?.length === 0 && (
          <div className="mt-9 border-y border-sand py-10 text-center">
            <p className="text-sm font-medium text-ink">No models are currently available.</p>
            <p className="mt-1 text-sm text-clay">Check the inference service and refresh the catalog.</p>
          </div>
        )}

        {!loading && !models && (
          <Notice variant="warning" title="The live model catalog is unavailable." className="mt-8">
            {error ?? "The inference service may be offline."}{" "}
            <button type="button" onClick={onRetry} className="font-medium underline underline-offset-2">
              Retry
            </button>
          </Notice>
        )}
      </div>
    </section>
  );
}

/** Public landing page for the ClearLens image restoration platform. */
export default function LandingPage() {
  const { status } = useSession();
  const authed = status === "authenticated";
  const { models, loading, error, reload } = useModels();

  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <SiteNav />

      <main className="flex-1">
        <section className="relative isolate overflow-hidden">
          <div className="landing-hero-backdrop pointer-events-none absolute z-0" aria-hidden="true" />
          <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-16 pt-11 sm:px-6 sm:pb-20 sm:pt-14 lg:grid-cols-[0.98fr_1.02fr] lg:gap-12 lg:px-8 lg:pb-[4.5rem] lg:pt-[4.25rem]">
            <div className="animate-fade-up">
              <p className="inline-flex items-center gap-2 rounded-full border border-sand bg-parchment px-3.5 py-1.5 text-xs font-medium text-maroon">
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
                AI-powered image restoration
              </p>
              <h1 className="mt-5 max-w-[34rem] font-display text-[2.8rem] font-semibold leading-[0.99] tracking-[-0.045em] text-ink sm:text-6xl lg:text-[3.75rem] xl:text-[4.15rem]">
                Bring Clarity
                <br />
                Back to Your Images
              </h1>
              <p className="mt-5 max-w-[31rem] text-[0.96rem] leading-[1.7] text-clay sm:text-base">
                Explore image dehazing with research-published architectures. Upload a hazy photograph, compare the processed result, and download the restored image.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <WorkspaceLink className="btn-pill btn-pill-primary group px-5 py-3">
                  {authed ? "Open the Studio" : "Try ClearLens"}
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                </WorkspaceLink>
                <a href="#how-it-works" className="inline-flex items-center gap-2 rounded-field border border-sand bg-white/75 px-4 py-3 text-sm font-semibold text-ink transition-colors hover:bg-white">
                  How it works
                  <ArrowRight className="h-4 w-4 text-clay" aria-hidden="true" />
                </a>
              </div>

              <ul className="mt-8 grid max-w-[34rem] grid-cols-1 divide-y divide-sand border-t border-sand pt-1 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:border-b sm:pb-1">
                {HERO_FEATURES.map(({ icon: Icon, label, caption }) => (
                  <li key={label} className="flex items-start gap-2.5 py-3.5 sm:px-3 sm:first:pl-0 sm:last:pr-0">
                    <Icon className="mt-0.5 h-[1.1rem] w-[1.1rem] shrink-0 text-maroon" strokeWidth={1.8} aria-hidden="true" />
                    <span>
                      <span className="block text-xs font-semibold leading-tight text-ink">{label}</span>
                      <span className="mt-1 block text-[0.625rem] leading-snug text-clay">{caption}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div id="comparison" className="animate-fade-up mx-auto w-full max-w-[34rem] lg:max-w-none">
              <CompareShowcase />
            </div>
          </div>
        </section>

        <MetricStrip models={models} loading={loading} />

        <section id="how-it-works" className="scroll-mt-20">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1fr_0.9fr] lg:gap-16 lg:px-8 lg:py-24">
            <div className="relative mx-auto h-[19rem] w-full max-w-[35rem] sm:h-[24rem] lg:order-1" aria-label="Illustrative before and after mountain photographs">
              <div className="absolute left-[1%] top-[22%] h-[65%] w-[61%] -rotate-[7deg] overflow-hidden rounded-xl border-[5px] border-white shadow-card sm:border-[7px]">
                <Image src="/mountain-hazy.jpg" alt="" fill sizes="(max-width: 640px) 60vw, 340px" className="object-cover" />
              </div>
              <div className="absolute left-[19%] top-[11%] h-[67%] w-[62%] rotate-[4deg] overflow-hidden rounded-xl border-[5px] border-white shadow-card sm:border-[7px]">
                <Image src="/peak-hazy.jpg" alt="" fill sizes="(max-width: 640px) 60vw, 340px" className="object-cover" />
              </div>
              <div className="absolute left-[37%] top-[1%] h-[72%] w-[61%] -rotate-[2deg] overflow-hidden rounded-xl border-[5px] border-white shadow-lift sm:border-[7px]">
                <Image src="/peak-clear.jpg" alt="" fill sizes="(max-width: 640px) 60vw, 340px" className="object-cover" />
              </div>
              <span className="absolute bottom-[3%] left-[8%] rounded-full border border-sand bg-cream/95 px-3 py-1.5 text-[0.6875rem] font-medium text-clay shadow-sm">
                Sample image pair
              </span>
            </div>

            <div className="lg:order-2">
              <p className="badge-pill">How it works</p>
              <h2 className="mt-4 max-w-xl font-display text-3xl leading-[1.1] tracking-[-0.035em] text-ink sm:text-4xl">
                A smarter dehazing pipeline.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-clay sm:text-base">
                ClearLens connects image upload, model selection, and side-by-side review in one focused workspace.
              </p>
              <ol className="mt-7 divide-y divide-sand border-y border-sand">
                {PIPELINE_STEPS.map(({ icon: Icon, title, body }, index) => (
                  <li key={title} className="flex gap-4 py-4">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-parchment text-maroon">
                      <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <span className="pt-0.5">
                      <span className="block text-sm font-semibold text-ink">{index + 1}. {title}</span>
                      <span className="mt-1 block text-sm leading-relaxed text-clay">{body}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <ModelCatalog models={models} loading={loading} error={error} onRetry={() => void reload()} />

        <section id="use-cases" className="scroll-mt-20">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
            <div className="max-w-2xl">
              <p className="badge-pill">Use cases</p>
              <h2 className="mt-4 font-display text-3xl leading-[1.12] tracking-[-0.035em] text-ink sm:text-4xl">
                Clearer frames for careful work.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-clay sm:text-base">
                Explore where visibility restoration can support image review and analysis.
              </p>
            </div>
            <div className="mt-9 grid gap-x-10 sm:grid-cols-2">
              {USE_CASES.map(({ icon: Icon, title, body }) => (
                <article key={title} className="flex gap-4 border-t border-sand py-5 sm:py-6">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-parchment text-maroon">
                    <Icon className="h-[1.1rem] w-[1.1rem]" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <span>
                    <h3 className="text-sm font-semibold text-ink">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-clay">{body}</p>
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8 lg:pb-24">
          <div className="flex flex-col items-start justify-between gap-7 rounded-2xl bg-maroon px-6 py-9 text-white sm:px-9 sm:py-10 lg:flex-row lg:items-center lg:px-12">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl leading-tight tracking-[-0.025em] text-white sm:text-3xl">
                Bring your next image into focus.
              </h2>
              <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-white/75 sm:text-base">
                Explore the model catalog, then run a dehazing workflow in the ClearLens Studio.
              </p>
            </div>
            <div>
              <WorkspaceLink className="btn-pill btn-pill-inverse group px-5 py-3">
                {authed ? "Open the Studio" : "Get Started"}
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
              </WorkspaceLink>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
