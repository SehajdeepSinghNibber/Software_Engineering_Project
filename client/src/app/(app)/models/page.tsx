"use client";

import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { useModels } from "@/hooks/useModels";
import { formatUptime } from "@/lib/format";

function WeightsBadge({ state }: { state: string }) {
  const cls =
    state === "trained"
      ? "border-success/40 bg-success/10 text-base-content"
      : state === "partial"
        ? "border-warning/50 bg-warning/10 text-base-content"
        : "border-base-300 bg-base-200 text-base-content/70";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.6875rem] font-medium ${cls}`}>
      {state === "trained" ? "trained" : state === "partial" ? "partial" : "untrained"}
    </span>
  );
}

export default function ModelsPage() {
  const { models, health, loading, error, reload } = useModels();
  const online = health !== null;

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Model catalog"
        description="The architectures available in the inference service, loaded on demand and cached between requests."
      />

      {/* Service banner */}
      {loading ? (
        <div className="skeleton h-12 w-full" />
      ) : online ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-box border border-base-300/70 bg-base-100 px-5 py-3.5 text-sm">
          <span className="flex items-center gap-2 font-medium">
            <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
            Inference service online
          </span>
          <span className="font-mono text-xs text-base-content/50">
            uptime {formatUptime(health!.uptimeSeconds)} · default {health!.model} · {health!.defaultSize}px
          </span>
        </div>
      ) : (
        <Notice
          variant="warning"
          title="Inference service is offline"
        >
          {error}{" "}
          <button type="button" onClick={() => void reload()} className="underline underline-offset-2">
            Retry
          </button>
        </Notice>
      )}

      {/* Catalog */}
      <section className="mt-6">
        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-24 w-full" />
            ))}
          </div>
        )}

        {!loading && models && models.length > 0 && (
          <ul className="divide-y divide-base-300/70 rounded-box border border-base-300/70 bg-base-100">
            {models.map((model) => (
              <li key={model.name} className="px-5 py-5 sm:px-6">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <h3 className="font-mono text-sm font-semibold">{model.name}</h3>
                  <WeightsBadge state={model.weightsState} />
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-base-content/65">
                  {model.description}
                </p>
                <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-1 font-mono text-xs text-base-content/50">
                  <div className="flex gap-1.5">
                    <dt className="text-base-content/40">default size</dt>
                    <dd>{model.defaultSize}px</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt className="text-base-content/40">divisible by</dt>
                    <dd>{model.divisible}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt className="text-base-content/40">norm</dt>
                    <dd>{model.norm === "11" ? "[-1, 1]" : model.norm === "01" ? "[0, 1]" : "auto"}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt className="text-base-content/40">device</dt>
                    <dd>{model.device}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}

        {!loading && !models && (
          <Notice variant="error" title="Could not load the model catalog.">
            {error}
          </Notice>
        )}
      </section>

      <p className="mt-6 max-w-2xl text-xs leading-relaxed text-base-content/45">
        Models are built from the research implementations in{" "}
        <span className="font-mono">ML/baselines</span> and served behind the
        authenticated{" "}
        <span className="font-mono">POST /api/v1/ml/dehaze</span> endpoint. The
        weights badge reflects the checkpoint configured on the server via{" "}
        <span className="font-mono">ML_MODEL_PATH</span>.
      </p>
    </div>
  );
}