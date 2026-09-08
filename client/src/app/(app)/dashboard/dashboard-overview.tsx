"use client";

import Link from "next/link";

import { useSession } from "@/components/providers/SessionProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { Stat } from "@/components/ui/Stat";
import { useModels } from "@/hooks/useModels";
import { formatDateTime, formatMs, formatUptime } from "@/lib/format";
import { clearHistory, getHistory } from "@/lib/history";
import type { HistoryEntry } from "@/lib/types";
import { useEffect, useState } from "react";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardOverview() {
  const { user } = useSession();
  const { models, health, loading } = useModels();
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);

  // Read localStorage after mount (SSR-safe).
  useEffect(() => {
    let ignore = false;
    // The async boundary keeps the first client render identical to the
    // server's (both show the skeleton).
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
        description="Here's the state of your de-hazing workspace."
      />

      {/* Service snapshot */}
      <section className="rounded-box border border-base-300/70 bg-base-100 px-5 py-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-10" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <Stat
              label="Inference service"
              value={serviceOnline ? "Online" : "Offline"}
              hint={serviceOnline ? health!.status : "not reachable"}
            />
            <Stat
              label="Uptime"
              value={serviceOnline ? formatUptime(health!.uptimeSeconds) : "—"}
            />
            <Stat
              label="Default model"
              value={serviceOnline ? health!.model : "—"}
            />
            <Stat
              label="Architectures"
              value={models ? String(models.length) : "—"}
              hint="registered"
            />
          </div>
        )}
        {!loading && !serviceOnline && (
          <Notice variant="warning" className="mt-4">
            The ML inference service isn&apos;t responding. De-hazing is
            unavailable until it&apos;s back — everything else keeps working.
          </Notice>
        )}
      </section>

      {/* Primary action */}
      <Link
        href="/studio"
        className="group mt-6 flex items-center justify-between gap-4 rounded-box bg-base-content px-6 py-6 text-base-100 transition-opacity hover:opacity-95"
      >
        <div>
          <p className="text-base font-semibold tracking-tight">Run a de-haze</p>
          <p className="mt-1 text-sm text-base-100/65">
            Upload a hazy image and compare the restored result side by side.
          </p>
        </div>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1"
          aria-hidden="true"
        >
          <path d="M4 12h15m0 0-6-6m6 6-6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>

      {/* Recent activity */}
      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Recent activity</h2>
            <p className="mt-0.5 text-xs text-base-content/50">
              Runs are recorded on this device only — the de-haze API is stateless.
            </p>
          </div>
          {history && history.length > 0 && (
            <button
              type="button"
              onClick={() => {
                clearHistory();
                setHistory([]);
              }}
              className="btn btn-ghost btn-xs text-base-content/60"
            >
              Clear history
            </button>
          )}
        </div>

        {history === null && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-16 w-full" />
            ))}
          </div>
        )}

        {history !== null && history.length === 0 && (
          <EmptyState
            title="No runs yet"
            description="De-hazed results from this browser will appear here with their inference details."
            action={
              <Link href="/studio" className="btn btn-primary btn-sm">
                Open the Studio
              </Link>
            }
          />
        )}

        {history !== null && history.length > 0 && (
          <ul className="divide-y divide-base-300/70 rounded-box border border-base-300/70 bg-base-100">
            {history.map((entry) => (
              <li key={entry.id} className="flex items-center gap-4 px-4 py-3 sm:px-5">
                <span className="relative flex shrink-0 items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element -- data URL thumbnail */}
                  <img
                    src={entry.inputThumb}
                    alt=""
                    className="h-12 w-12 rounded-field border border-base-300 object-cover"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element -- data URL thumbnail */}
                  <img
                    src={entry.outputThumb}
                    alt=""
                    className="-ml-3 h-12 w-12 rounded-field border border-base-100 object-cover shadow-sm"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{entry.inputName}</span>
                  <span className="mt-0.5 block font-mono text-xs text-base-content/50">
                    {entry.model} · {formatMs(entry.inferenceMs)} · {entry.outputWidth}×{entry.outputHeight}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-base-content/45">
                  {formatDateTime(entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}