import {
  Braces,
  Cpu,
  FlaskConical,
  Server,
  ShieldCheck,
} from "lucide-react";

import { CtaBand } from "@/components/marketing/CtaBand";
import { PageHero } from "@/components/marketing/PageHero";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteNav } from "@/components/marketing/SiteNav";

const LAYERS = [
  {
    icon: Braces,
    title: "Next.js client",
    body: "React 19, Tailwind CSS and DaisyUI on the App Router — typed routes, session-aware navigation and a studio-style upload flow.",
  },
  {
    icon: Cpu,
    title: "Inference service",
    body: "A FastAPI + PyTorch service that loads each architecture on demand and reports device, weights state and timings.",
  },
  {
    icon: Server,
    title: "Fastify API",
    body: "Node + TypeScript with MongoDB persistence, bcrypt password hashing and JWT cookie sessions guarding every upload.",
  },
  {
    icon: FlaskConical,
    title: "Research baselines",
    body: "Dehamer, AOD-Net and Light-DehazeNet checkpoints, plus an evaluation harness scoring PSNR and SSIM on held-out data.",
  },
] as const;

const PRINCIPLES = [
  {
    icon: ShieldCheck,
    title: "Privacy first",
    body: "De-hazed uploads are processed in memory and never persisted — only profile pictures are stored in Cloudinary.",
  },
  {
    icon: FlaskConical,
    title: "Research grounded",
    body: "Every model in production comes from published, peer-reviewed work — retrained, benchmarked and documented.",
  },
  {
    icon: Cpu,
    title: "Honest engineering",
    body: "The API reports whether weights are trained or bundled defaults, so a demo can never fake a result.",
  },
] as const;

export default function AboutPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <SiteNav />

      <main className="flex-1">
        <PageHero
          eyebrow="About"
          title="A research project that grew into a product."
          lede="ClearLens began as a software-engineering capstone: take three published de-hazing networks and wrap them in a production-grade web platform."
        />

        {/* ——— Story ——— */}
        <section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl space-y-4 text-base leading-[1.8] text-clay">
            <p>
              Most de-hazing research stops at a Jupyter notebook. ClearLens asks what it takes to
              ship the same models to real users: an authenticated client, honest error handling,
              file validation, and an inference service that can be swapped or scaled without
              touching the rest of the stack.
            </p>
            <p>
              The result is a full product loop — upload a hazy frame, pick an architecture, watch
              the result stream back with real timings, and download it. Every request is guarded by
              JWT cookie sessions, and every response discloses which weights produced it.
            </p>
          </div>
        </section>

        {/* ——— How it's built ——— */}
        <section className="border-y border-sand/80 bg-parchment/60">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <div className="max-w-2xl">
              <p className="badge-pill">
                <span className="badge-pill-dot" aria-hidden="true" />
                Architecture
              </p>
              <h2 className="mt-4 font-display text-3xl leading-tight tracking-[0.01em] text-ink sm:text-4xl">
                How it&apos;s built
              </h2>
              <p className="mt-3 text-base leading-relaxed text-clay">
                Four layers, each replaceable on its own — the client never talks to the inference
                service directly, and the API never trusts a file it hasn&apos;t validated.
              </p>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {LAYERS.map(({ icon: Icon, title, body }) => (
                <article key={title} className="card-luxe p-6">
                  <span className="inline-grid h-11 w-11 place-content-center rounded-xl border border-sand bg-parchment text-maroon">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-4 font-display text-lg leading-snug tracking-[0.01em] text-ink">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-clay">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ——— Principles ——— */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-2xl">
            <p className="badge-pill">
              <span className="badge-pill-dot" aria-hidden="true" />
              Principles
            </p>
            <h2 className="mt-4 font-display text-3xl leading-tight tracking-[0.01em] text-ink sm:text-4xl">
              What we hold the line on
            </h2>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {PRINCIPLES.map(({ icon: Icon, title, body }) => (
              <article
                key={title}
                className="card-luxe p-6 transition-shadow duration-200 hover:shadow-lift"
              >
                <span className="inline-grid h-11 w-11 place-content-center rounded-xl border border-sand bg-parchment text-maroon">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <h3 className="mt-4 font-display text-lg leading-snug tracking-[0.01em] text-ink">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-clay">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <CtaBand
          title="Take the tour yourself."
          body="Create an account, upload a hazy frame and see the full product loop in action."
          href="/signup"
          label="Get started"
        />
      </main>

      <SiteFooter />
    </div>
  );
}
