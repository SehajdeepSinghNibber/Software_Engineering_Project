/**
 * Client-side run history.
 *
 * The backend's de-haze flow is synchronous and stateless — there is no jobs
 * table to read from. Runs are therefore recorded on this device (localStorage)
 * with small canvas-generated thumbnails, and every surface that shows them
 * says so explicitly.
 */
import type { DehazeResult, HistoryEntry } from "./types";

const STORAGE_KEY = "clearlens.history.v1";
const MAX_ENTRIES = 12;

export function getHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is HistoryEntry =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as HistoryEntry).id === "string",
    );
  } catch {
    return [];
  }
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}

/** Downscale any image source to a compact JPEG data URL. */
export function makeThumbnail(src: string, max = 384): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, max / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas is not supported in this browser."));
        return;
      }
      ctx.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    image.onerror = () => reject(new Error("Could not read the image."));
    image.src = src;
  });
}

export async function recordRun(
  result: DehazeResult,
  input: { name: string; previewUrl: string },
): Promise<void> {
  const entry: HistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: result.processedAt,
    inputName: input.name,
    model: result.model,
    inputSize: result.inputSize,
    outputWidth: result.outputWidth,
    outputHeight: result.outputHeight,
    inferenceMs: result.inferenceMs,
    weightsState: result.weightsState,
    inputThumb: await makeThumbnail(input.previewUrl),
    outputThumb: await makeThumbnail(result.outputImage),
  };

  const next = [entry, ...getHistory()].slice(0, MAX_ENTRIES);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota exceeded (or storage blocked) — drop the oldest and retry once.
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, 4)));
    } catch {
      /* give up silently — history is a convenience, not critical */
    }
  }
}