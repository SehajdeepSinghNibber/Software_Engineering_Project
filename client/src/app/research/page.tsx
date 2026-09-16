import { Feather, FlaskConical, Focus, Gauge, Layers, Network, Sigma } from "lucide-react";

import { CtaBand } from "@/components/marketing/CtaBand";
import { PageHero } from "@/components/marketing/PageHero";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteNav } from "@/components/marketing/SiteNav";

const MODELS = [
  {
    name: "dehamer",
    tag: "Transformer U-Net",
    icon: Network,
    blurb:
      "A U-Net built on Swin-Transformer blocks, fusing local detail with long-range context to recover radiance from heavy, non-uniform haze.",
    input: "−1 … 1",
    size: "224 px",
    source: "ML/baselines/dehamer",
  },
  {
    name: "aod",
    tag: "All-in-one CNN",
    icon: Focus,
    blurb:
      "The classic AOD-Net — a light CNN that jointly estimates the transmission map and atmospheric light through a single K(x) correction, making end-to-end de-hazing practical.",
    input: "0 … 1",
    size: "224 px",
    source: "ML/baselines/aod",
  },
  {
    name: "light_dehaze",
    tag: "Compact CNN",
    icon: Feather,
    blurb:
      "A deliberately small network with separable convolutions — fast enough for edge deployment while keeping competitive restoration quality.",
    input: "0 … 1",
    size: "224 px",
    source: "ML/baselines/light_dehaze",
  },
] as const;

const STAGES = [
  {
    step: "01",
    title: "Letterbox resize",
    body: "The frame is scaled to the model working resolution, preserving aspect ratio with padding.",
  },
  {
    step: "02",
    title: "Normalise",
    body: "Pixels are scaled to the expected range — −1…1 for Dehamer, 0…1 for the others.",
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
          title="Peer-reviewed de-hazing, production-wrapped."
          lede="ClearLens is built on published image-restoration research — from the classic all-in-one AOD-Net to the Swin-Transformer based Dehamer — retrained and served through one inference pipeline."
        />

        {/* ——— Architectures ——— */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-2xl">
            <p className="badge-pill">
              <span className="badge-pill-dot" aria-hidden="true" />
              Architectures
            </p>
            <h2 className="mt-4 font-display text-3xl leading-tight tracking-[0.01em] text-ink sm:text-4xl">
              Three networks, one interface
            </h2>
            <p className="mt-3 text-base leading-relaxed text-clay">
              Each architecture ships with its own preprocessing rules, weights and checkpoints —
              selected per request through the same de-haze endpoint.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
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
                Restoration quality is scored with PSNR and SSIM across held-out haze datasets via
                the evaluation harness in <span className="font-mono text-sm text-ink">ML/evaluation</span> —
                results are tracked per architecture as training progresses.
              </p>
              <p className="mt-3 text-base leading-relaxed text-clay">
                The API also reports <span className="font-mono text-sm text-ink">X-Weights-State</span>{" "}
                on every response, so you always know whether a model ran on trained weights or the
                bundled defaults.
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
                  Benchmarks run on haze sets the models never saw during training.
                </p>
              </div>
              <div className="card-luxe p-6">
                <Layers className="h-5 w-5 text-maroon" strokeWidth={1.75} />
                <p className="mt-3 text-sm font-semibold text-ink">CPU &amp; CUDA</p>
                <p className="mt-1 text-sm leading-relaxed text-clay">
                  Checkpoints are evaluated on both device targets the service supports.
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