import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Car,
  Globe,
  Mountain,
  Plane,
  ShieldCheck,
} from "lucide-react";

import { CtaBand } from "@/components/marketing/CtaBand";
import { PageHero } from "@/components/marketing/PageHero";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteNav } from "@/components/marketing/SiteNav";

const USE_CASES = [
  {
    icon: Plane,
    title: "Aerial & drone imagery",
    body: "Survey and inspection flights lose ground detail to atmospheric haze — de-hazing recovers readable terrain and surfaces.",
  },
  {
    icon: Car,
    title: "Traffic & transport",
    body: "Cleaner license plates, signage and lane markings for analytics, tolling and incident review.",
  },
  {
    icon: Mountain,
    title: "Landscape & travel photography",
    body: "Rescue hazy horizon shots and bring back depth without repainting the scene.",
  },
  {
    icon: Globe,
    title: "Satellite & remote sensing",
    body: "Peel back atmospheric scattering so land-cover classifications and change detection stay honest.",
  },
  {
    icon: ShieldCheck,
    title: "Security & surveillance",
    body: "Sharper frames at distance for monitoring, forensics and evidence review.",
  },
  {
    icon: Building2,
    title: "Smart cities & environment",
    body: "Track visibility and air-quality trends across fixed cameras over time.",
  },
] as const;

export default function UseCasesPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <SiteNav />

      <main className="flex-1">
        <PageHero
          eyebrow="Use Cases"
          title="Where clear visibility matters."
          lede="From drone surveys to street-level traffic analysis, ClearLens lifts the haze that blurs detail and breaks computer-vision pipelines."
        >
          <Link href="/signup" className="btn-pill btn-pill-primary group px-6 py-3">
            Start de-hazing
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
          <Link href="/research" className="link-chevron">
            Read the research
          </Link>
        </PageHero>

        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {USE_CASES.map(({ icon: Icon, title, body }) => (
              <article
                key={title}
                className="card-luxe p-6 transition-shadow duration-200 hover:shadow-lift"
              >
                <span className="inline-grid h-11 w-11 place-content-center rounded-xl border border-sand bg-parchment text-maroon">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <h2 className="mt-4 font-display text-xl leading-snug tracking-[0.01em] text-ink">
                  {title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-clay">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <CtaBand
          title="Your images could look like this."
          body="Upload a hazy frame from any of these scenarios and see the haze lift in real time."
          href="/signup"
          label="Start de-hazing"
        />
      </main>

      <SiteFooter />
    </div>
  );
}
