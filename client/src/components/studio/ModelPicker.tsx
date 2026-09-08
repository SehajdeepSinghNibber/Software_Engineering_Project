"use client";

import type { ModelInfo } from "@/lib/types";

/** Shown only when the live catalog can't be reached — same ids as the server. */
const FALLBACK_MODELS: ModelInfo[] = [
  {
    name: "dehamer",
    description: "Dehamer: Swin-Transformer U-Net for single image dehazing (Guo et al., 2022).",
    defaultSize: 224,
    divisible: 8,
    norm: "11",
    weightsState: "untrained",
    device: "cpu",
  },
  {
    name: "aod",
    description: "AOD-Net: All-in-One Dehazing Network (Li et al., 2017), a light CNN that directly estimates the clean image.",
    defaultSize: 224,
    divisible: 1,
    norm: "01",
    weightsState: "untrained",
    device: "cpu",
  },
  {
    name: "light_dehaze",
    description: "Light-DehazeNet: a compact dehazing architecture trained on paired hazy/clear imagery.",
    defaultSize: 224,
    divisible: 1,
    norm: "01",
    weightsState: "untrained",
    device: "cpu",
  },
];

function WeightsBadge({ state }: { state: string }) {
  const cls =
    state === "trained"
      ? "border-success/40 bg-success/10 text-base-content"
      : state === "partial"
        ? "border-warning/50 bg-warning/10 text-base-content"
        : "border-base-300 bg-base-200 text-base-content/70";
  const label = state === "trained" ? "Trained weights" : state === "partial" ? "Partial weights" : "Untrained weights";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.6875rem] font-medium ${cls}`}>
      {label}
    </span>
  );
}

export function ModelPicker({
  models,
  loading,
  value,
  onChange,
  disabled = false,
}: {
  models: ModelInfo[] | null;
  loading?: boolean;
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
}) {
  const usingFallback = !models && !loading;
  const list = models ?? (usingFallback ? FALLBACK_MODELS : null);

  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-base-content/50">
        Model
      </legend>

      {loading && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-[4.5rem] w-full" />
          ))}
        </div>
      )}

      {!loading && list && (
        <div className="space-y-2">
          {list.map((model) => {
            const checked = value === model.name;
            return (
              <label
                key={model.name}
                className={`flex cursor-pointer items-start gap-3 rounded-box border px-4 py-3 transition-colors ${
                  checked
                    ? "border-base-content/60 bg-base-200"
                    : "border-base-300 hover:border-base-content/25 hover:bg-base-200/50"
                } ${disabled ? "pointer-events-none opacity-60" : ""}`}
              >
                <input
                  type="radio"
                  name="dehaze-model"
                  value={model.name}
                  checked={checked}
                  onChange={() => onChange(model.name)}
                  className="mt-1 radio radio-xs"
                  disabled={disabled}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-mono text-sm font-medium">{model.name}</span>
                    <WeightsBadge state={model.weightsState} />
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-base-content/55">
                    {model.description}
                  </span>
                  <span className="mt-1.5 block font-mono text-[0.6875rem] text-base-content/45">
                    default {model.defaultSize}px · {model.norm === "11" ? "[-1, 1]" : "[0, 1]"} norm · {model.device}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      )}

      {usingFallback && (
        <p className="mt-2 text-xs text-base-content/50">
          Live model catalog is unreachable — showing built-in architectures.
        </p>
      )}
    </fieldset>
  );
}