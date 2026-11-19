"use client";

import Link from "next/link";
import { ArrowRight, Activity, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSession } from "@/components/providers/SessionProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { useModels } from "@/hooks/useModels";
import { formatDateTime, formatMs } from "@/lib/format";
import { clearHistory, getHistory } from "@/lib/history";
import type { HistoryEntry } from "@/lib/types";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardOverview() {
  const { user } = useSession();
  const { health, loading } = useModels();
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) setHistory(getHistory());
    });
    return () => {
      ignore = true;
    };
  }, []);

  const firstName = user?.fullName.trim().split(/\s+/)[0] ?? "there";
  const serviceOnline = health !== null;

  return (
    <div className="animate-fade-up">
      <PageHeader
        title={`${greeting()}, ${firstName}.`}
        description="Your image restoration workspace at a glance."
        actions={
          <Link href="/studio" className="btn btn-primary group gap-2">
            New de-haze
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        }
      />

      <section aria-labelledby="service-heading" className="border-y border-base-300/80 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Activity className="h-[1.1rem] w-[1.1rem] text-maroon" strokeWidth={1.8} aria-hidden="true" />
            <h2 id="service-heading" className="text-sm font-semibold tracking-tight">Inference service</h2>
          </div>
          {!loading && (
            <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${serviceOnline ? "bg-secondary text-secondary-content" : "bg-error/10 text-error"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${serviceOnline ? "bg-success" : "bg-error"}`} aria-hidden="true" />
              {serviceOnline ? "Online" : "Offline"}
            </span>
          )}
        </div>

        {loading ? (
          <div className="mt-5 grid gap-5 sm:grid-cols-2" aria-busy="true" aria-label="Loading service status">
            <div className="skeleton h-12" />
            <div className="skeleton h-12" />
          </div>
        ) : (
          <dl className="mt-4 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-base-content/55">Connection</dt>
              <dd className="mt-1 text-sm font-medium">{serviceOnline ? health!.status : "Not reachable"}</dd>
            </div>
            <div>
              <dt className="text-xs text-base-content/55">Default model</dt>
              <dd className="mt-1 font-mono text-sm font-medium">{serviceOnline ? health!.model : "Unavailable"}</dd>
            </div>
          </dl>
        )}

        {!loading && !serviceOnline && (
          <Notice variant="warning" className="mt-4">
            The ML inference service isn&apos;t responding. De-hazing is unavailable until it&apos;s back. Your workspace and saved local history remain available.
          </Notice>
        )}
      </section>

      <section aria-labelledby="start-heading" className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-box border border-base-300/80 bg-base-200/55 px-5 py-5 sm:px-6">
        <div className="max-w-xl">
          <h2 id="start-heading" className="text-sm font-semibold tracking-tight">Restore an image</h2>
          <p className="mt-1 text-sm leading-relaxed text-base-content/60">
            Upload a hazy photograph, choose a model, and compare the result with the original.
          </p>
        </div>
        <Link href="/studio" className="link-chevron group shrink-0">
          Open Studio
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </section>

      <section aria-labelledby="activity-heading" className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="activity-heading" className="text-lg font-semibold tracking-tight">Recent activity</h2>
            <p className="mt-1 text-xs text-base-content/55">
              Runs are saved in this browser. The de-haze API is stateless.
            </p>
          </div>
          {history && history.length > 0 && (
            <button
              type="button"
              onClick={() => {
                clearHistory();
                setHistory([]);
              }}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-base-content/55 transition-colors hover:bg-base-200 hover:text-base-content"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Clear history
            </button>
          )}
        </div>

        {history === null && (
          <div className="divide-y divide-base-300/70 border-y border-base-300/80" aria-busy="true" aria-label="Loading recent activity">
            {[0, 1, 2].map((index) => <div key={index} className="skeleton my-3 h-13 w-full" />)}
          </div>
        )}

        {history !== null && history.length === 0 && (
          <EmptyState
            title="No runs yet"
            description="De-hazed results from this browser will appear here with their inference details."
            action={<Link href="/studio" className="btn btn-primary btn-sm">Open the Studio</Link>}
          />
        )}

        {history !== null && history.length > 0 && (
          <div className="overflow-hidden border-y border-base-300/80">
            <div className="hidden grid-cols-[minmax(0,1.8fr)_minmax(7rem,0.8fr)_7rem_minmax(8.5rem,1fr)] gap-4 bg-base-200/60 px-4 py-2.5 text-[0.6875rem] font-medium text-base-content/55 sm:grid sm:px-5">
              <span>Source image</span>
              <span>Model</span>
              <span>Inference</span>
              <span>Processed</span>
            </div>
            <ul className="divide-y divide-base-300/70">
              {history.map((entry) => (
                <li key={entry.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-3.5 transition-colors hover:bg-base-200/35 sm:grid-cols-[minmax(0,1.8fr)_minmax(7rem,0.8fr)_7rem_minmax(8.5rem,1fr)] sm:gap-4 sm:px-5">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex shrink-0 items-center">
                      {/* eslint-disable-next-line @next/next/no-img-element -- data URL thumbnail */}
                      <img src={entry.inputThumb} alt="" className="h-10 w-12 rounded-md border border-base-300 object-cover" />
                      {/* eslint-disable-next-line @next/next/no-img-element -- data URL thumbnail */}
                      <img src={entry.outputThumb} alt="" className="-ml-3 h-10 w-12 rounded-md border-2 border-white object-cover" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{entry.inputName}</span>
                      <span className="mt-0.5 block truncate text-[0.6875rem] text-base-content/50 sm:hidden">
                        {entry.model} · {formatMs(entry.inferenceMs)} · {formatDateTime(entry.createdAt)}
                      </span>
                    </span>
                  </span>
                  <span className="hidden truncate font-mono text-xs text-base-content/70 sm:block">{entry.model}</span>
                  <span className="text-right font-mono text-xs text-base-content/65 sm:text-left">{formatMs(entry.inferenceMs)}</span>
                  <span className="hidden text-xs text-base-content/55 sm:block">{formatDateTime(entry.createdAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
