import { FlaskConical, Gauge, Layers, Network, Sigma } from "lucide-react";

import { CtaBand } from "@/components/marketing/CtaBand";
import { PageHero } from "@/components/marketing/PageHero";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteNav } from "@/components/marketing/SiteNav";

const MODELS = [
  {
    name: "DRNet",
    tag: "Prior-guided restoration network",
    icon: Network,
    blurb:
      "A multi-task image restoration model using task-specific prompts and dynamic reparameterization. ClearLens selects its trained dehazing task and applies the official three-task checkpoint.",
    input: "0 … 1 RGB",
    size: "Native image resolution",
    source: "AVC2-UESTC/DRNet-AiO",
  },
] as const;

const STAGES = [
  {
    step: "01",
    title: "Native resolution",
    body: "The RGB frame remains at its original resolution and is padded to DRNet’s 64px window boundary.",
  },
  {
    step: "02",
    title: "Normalise",
    body: "Pixels are converted to RGB and scaled into the model’s expected [0, 1] range.",
  },
  {
    step: "03",
    title: "Forward pass",
    body: "The network runs a single inference pass to estimate and remove the haze.",
  },
  {
    step: "04",
    title: "Restore",
    body: "The output is un-normalised and resized back to the original frame dimensions.",
  },
] as const;

export default function ResearchPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <SiteNav />

      <main className="flex-1">
        <PageHero
          eyebrow="Research"
          title="Research-grade restoration, production-wrapped."
          lede="ClearLens serves one real, pretrained open-source model for image dehazing: DRNet’s task-conditioned three-task architecture, wrapped in a stable upload, inference, and comparison workflow."
        />

        {/* ——— Architectures ——— */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-2xl">
            <p className="badge-pill">
              <span className="badge-pill-dot" aria-hidden="true" />
              Active model
            </p>
            <h2 className="mt-4 font-display text-3xl leading-tight tracking-[0.01em] text-ink sm:text-4xl">
              One model, one clear workflow
            </h2>
            <p className="mt-3 text-base leading-relaxed text-clay">
              DRNet is loaded lazily from its upstream implementation and its checkpoint is required before inference. The app never returns output from random weights.
            </p>
          </div>

          <div className="mt-10 grid max-w-3xl gap-5">
            {MODELS.map(({ name, tag, icon: Icon, blurb, input, size, source }) => (
              <article key={name} className="card-luxe flex flex-col p-7">
                <div className="flex items-center justify-between">
                  <span className="inline-grid h-11 w-11 place-content-center rounded-xl border border-sand bg-parchment text-maroon">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <span className="rounded-full border border-sand bg-parchment px-2.5 py-1 text-[0.6875rem] font-medium text-clay">
                    {tag}
                  </span>
                </div>
                <p className="mt-5 font-display text-2xl tracking-[0.01em] text-ink">{name}</p>
                <p className="mt-2 text-sm leading-relaxed text-clay">{blurb}</p>
                <dl className="mt-6 space-y-2 border-t border-sand/80 pt-4 text-xs">
                  <div className="flex justify-between gap-4">
                    <dt className="text-clay/70">Input range</dt>
                    <dd className="font-mono text-ink">{input}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-clay/70">Working size</dt>
                    <dd className="font-mono text-ink">{size}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-clay/70">Weights</dt>
                    <dd className="font-mono text-ink">{source}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        {/* ——— Pipeline ——— */}
        <section className="border-y border-sand/80 bg-parchment/60">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="max-w-2xl">
              <p className="badge-pill">
                <span className="badge-pill-dot" aria-hidden="true" />
                Inference stages
              </p>
              <h2 className="mt-4 font-display text-3xl leading-tight tracking-[0.01em] text-ink sm:text-4xl">
                From hazy frame to clean result
              </h2>
              <p className="mt-3 text-base leading-relaxed text-clay">
                The Python service handles every stage explicitly — no hidden resizing, no surprise
                cropping.
              </p>
            </div>
            <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {STAGES.map(({ step, title, body }) => (
                <li key={step} className="card-luxe p-6">
                  <span className="font-display text-xl text-maroon/50">{step}</span>
                  <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-clay">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ——— Evaluation ——— */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <p className="badge-pill">
                <span className="badge-pill-dot" aria-hidden="true" />
                Evaluation
              </p>
              <h2 className="mt-4 font-display text-3xl leading-tight tracking-[0.01em] text-ink sm:text-4xl">
                Measured, not marketed
              </h2>
              <p className="mt-3 text-base leading-relaxed text-clay">
                This page reports the architecture and runtime settings used by the inference API.
                It does not present an image-quality score without a paired clear reference.
              </p>
              <p className="mt-3 text-base leading-relaxed text-clay">
                The inference API reports model identity and elapsed time. It refuses to run if the
                official pretrained checkpoint is unavailable.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="card-luxe p-6">
                <Gauge className="h-5 w-5 text-maroon" strokeWidth={1.75} />
                <p className="mt-3 text-sm font-semibold text-ink">PSNR</p>
                <p className="mt-1 text-sm leading-relaxed text-clay">
                  Peak signal-to-noise ratio against clean ground truth.
                </p>
              </div>
              <div className="card-luxe p-6">
                <Sigma className="h-5 w-5 text-maroon" strokeWidth={1.75} />
                <p className="mt-3 text-sm font-semibold text-ink">SSIM</p>
                <p className="mt-1 text-sm leading-relaxed text-clay">
                  Structural similarity — are edges and textures really preserved?
                </p>
              </div>
              <div className="card-luxe p-6">
                <FlaskConical className="h-5 w-5 text-maroon" strokeWidth={1.75} />
                <p className="mt-3 text-sm font-semibold text-ink">Held-out datasets</p>
                <p className="mt-1 text-sm leading-relaxed text-clay">
                  The upstream paper evaluates the model on restoration benchmarks.
                </p>
              </div>
              <div className="card-luxe p-6">
                <Layers className="h-5 w-5 text-maroon" strokeWidth={1.75} />
                <p className="mt-3 text-sm font-semibold text-ink">CPU &amp; CUDA</p>
                <p className="mt-1 text-sm leading-relaxed text-clay">
                  CUDA is used when available; CPU is supported as a fallback.
                </p>
              </div>
            </div>
          </div>
        </section>

        <CtaBand
          title="Put the research to work."
          body="Upload a frame and watch a published architecture strip the haze in real time."
          href="/signup"
          label="Start de-hazing"
        />
      </main>

      <SiteFooter />
    </div>
  );
}
