"use client";

import { useEffect, useState, type ChangeEvent } from "react";

import { useSession } from "@/components/providers/SessionProvider";
import { CompareSlider } from "@/components/studio/CompareSlider";
import { Dropzone } from "@/components/studio/Dropzone";
import { ModelPicker } from "@/components/studio/ModelPicker";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { Stat } from "@/components/ui/Stat";
import { useModels } from "@/hooks/useModels";
import { ApiError, mlApi } from "@/lib/api";
import { formatBytes, formatMs } from "@/lib/format";
import { recordRun } from "@/lib/history";
import type { DehazeResult } from "@/lib/types";

const SIZE_OPTIONS = [
  { value: "auto", label: "Auto (model default)" },
  { value: "224", label: "224 px" },
  { value: "256", label: "256 px" },
  { value: "384", label: "384 px" },
  { value: "512", label: "512 px" },
] as const;

export default function StudioWorkspace() {
  const { refresh } = useSession();
  const { models, loading: modelsLoading } = useModels();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [modelId, setModelId] = useState("dehamer");
  const [sizeOption, setSizeOption] = useState<string>("auto");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<DehazeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep the object URL lifecycle correct: revoke on replace and unmount.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Honest elapsed-time indicator while the request is in flight.
  useEffect(() => {
    if (!busy) return;
    const start = performance.now();
    const id = window.setInterval(() => setElapsed(performance.now() - start), 100);
    return () => window.clearInterval(id);
  }, [busy]);

  // The stored selection may not exist in the live catalog — fall back to the
  // first offered model instead of syncing state from an effect.
  const effectiveModelId =
    models && models.length > 0 && !models.some((m) => m.name === modelId)
      ? models[0]!.name
      : modelId;
  const selectedModel = models?.find((m) => m.name === effectiveModelId) ?? null;

  const onFileSelected = (next: File) => {
    setFile(next);
    setResult(null);
    setError(null);
    setPreviewUrl(URL.createObjectURL(next));
  };

  const removeFile = () => {
    setFile(null);
    setResult(null);
    setPreviewUrl(null);
  };

  const onSizeChange = (event: ChangeEvent<HTMLSelectElement>) =>
    setSizeOption(event.target.value);

  const run = async () => {
    if (!file || busy) return;
    setBusy(true);
    setElapsed(0);
    setError(null);
    setResult(null);
    try {
      const { data } = await mlApi.dehaze({
        file,
        model: effectiveModelId,
        size: sizeOption === "auto" ? undefined : Number(sizeOption),
      });
      setResult(data);
      if (previewUrl) {
        recordRun(data, { name: file.name, previewUrl }).catch(() => {
          /* history is a convenience — never block the result on it */
        });
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        void refresh(); // invalidates the session; AuthGate will redirect
      }
      setError(err instanceof Error ? err.message : "Something went wrong while de-hazing.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="De-hazing Studio"
        description="Upload a hazy photograph, choose an architecture, and compare the restored result against the original."
      />

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* ------------------------------ Controls ------------------------------ */}
        <section className="rounded-box border border-base-300/70 bg-base-100 p-5 sm:p-6">
          {/* 1 · Image */}
          <p className="mb-2 text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-base-content/50">
            1 · Image
          </p>
          {!file ? (
            <Dropzone onFileSelected={onFileSelected} disabled={busy} />
          ) : (
            <div className="flex items-center gap-3 rounded-box border border-base-300 bg-base-200/40 p-3">
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- object URL
                <img
                  src={previewUrl}
                  alt="Selected hazy image"
                  className="h-14 w-20 shrink-0 rounded-field border border-base-300 bg-checker object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="mt-0.5 font-mono text-xs text-base-content/50">{formatBytes(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={removeFile}
                disabled={busy}
                className="btn btn-ghost btn-xs text-base-content/60"
              >
                Remove
              </button>
            </div>
          )}

          <div className="my-5 h-px bg-base-300/70" />

          {/* 2 · Model */}
          <ModelPicker
            models={models}
            loading={modelsLoading}
            value={effectiveModelId}
            onChange={setModelId}
            disabled={busy}
          />

          <div className="my-5 h-px bg-base-300/70" />

          {/* 3 · Input size */}
          <div>
            <label
              htmlFor="input-size"
              className="mb-2 block text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-base-content/50"
            >
              3 · Input size
            </label>
            <select
              id="input-size"
              value={sizeOption}
              onChange={onSizeChange}
              disabled={busy}
              className="select w-full bg-base-100"
            >
              {SIZE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-base-content/50">
              {selectedModel
                ? `Auto uses ${selectedModel.name}'s default of ${selectedModel.defaultSize}px. Larger sizes take longer on CPU.`
                : "Leave on Auto to use the model's default input resolution."}
            </p>
          </div>

          <button
            type="button"
            onClick={run}
            disabled={!file || busy}
            className="btn btn-primary mt-6 w-full"
          >
            {busy && <span className="loading loading-spinner loading-xs" />}
            {busy ? "De-hazing…" : "De-haze image"}
          </button>
          <p className="mt-2.5 text-center text-xs text-base-content/45">
            Inference runs server-side · typical runs finish in seconds on CPU
          </p>
        </section>

        {/* ------------------------------ Result -------------------------------- */}
        <section className="min-w-0">
          {busy && (
            <div className="relative flex min-h-80 items-center justify-center overflow-hidden rounded-box border border-base-300 bg-checker">
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- object URL
                <img
                  src={previewUrl}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full object-contain opacity-40 blur-sm"
                />
              )}
              <div className="relative z-10 flex flex-col items-center gap-3 rounded-box border border-base-300/70 bg-base-100/90 px-8 py-6 text-center backdrop-blur">
                <span className="loading loading-spinner text-base-content/70" />
                <p className="text-sm font-medium">De-hazing with {effectiveModelId}…</p>
                <p className="font-mono text-xs text-base-content/50">
                  {(elapsed / 1000).toFixed(1)}s elapsed
                </p>
              </div>
            </div>
          )}

          {!busy && error && (
            <div className="space-y-4">
              <Notice variant="error" title="The de-haze request failed.">
                {error}
              </Notice>
              <div className="flex flex-col items-center justify-center rounded-box border border-dashed border-base-300 px-6 py-16 text-center">
                <p className="text-sm text-base-content/50">
                  Adjust the input and try again, or choose a different model.
                </p>
              </div>
            </div>
          )}

          {!busy && !error && result && previewUrl && (
            <div className="animate-fade-up space-y-5">
              <CompareSlider before={previewUrl} after={result.outputImage} />

              <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-box border border-base-300/70 bg-base-100 px-5 py-4 sm:grid-cols-4">
                <Stat label="Model" value={result.model} />
                <Stat label="Inference" value={formatMs(result.inferenceMs)} />
                <Stat label="Input" value={`${result.inputSize} px`} />
                <Stat
                  label="Output"
                  value={`${result.outputWidth}×${result.outputHeight}`}
                  hint="PNG"
                />
              </div>

              {result.weightsState !== "trained" && (
                <Notice variant="warning" title="Untrained weights">
                  The server is running this architecture without a trained
                  checkpoint
                  {result.weightsState === "partial" ? " (the checkpoint only covered some layers)" : ""}.
                  Results demonstrate the pipeline, not production quality.
                </Notice>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={result.outputImage}
                  download={`clearlens-${result.model}-${result.outputWidth}x${result.outputHeight}.png`}
                  className="btn btn-primary btn-sm"
                >
                  Download PNG
                </a>
                <button type="button" onClick={removeFile} className="btn btn-ghost btn-sm">
                  New image
                </button>
                <span className="ml-auto font-mono text-xs text-base-content/40">
                  processed {new Date(result.processedAt).toLocaleTimeString()}
                </span>
              </div>
            </div>
          )}

          {!busy && !error && !result && (
            <div className="flex min-h-80 flex-col items-center justify-center rounded-box border border-dashed border-base-300 px-6 py-14 text-center">
              <svg viewBox="0 0 32 32" fill="none" className="h-10 w-10 text-base-content/25" aria-hidden="true">
                <circle cx="16" cy="16" r="12.5" stroke="currentColor" strokeWidth="1.75" />
                <circle cx="16" cy="16" r="5" fill="currentColor" />
              </svg>
              <p className="mt-4 text-sm font-medium">Your result will appear here</p>
              <p className="mt-1 max-w-sm text-sm text-base-content/50">
                Pick an image and a model on the left, then run the de-haze.
                You&apos;ll be able to compare before and after and download the
                restored PNG.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}