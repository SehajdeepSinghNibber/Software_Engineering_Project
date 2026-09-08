"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Upload constraints mirror the backend exactly:
 * `ML_MAX_FILE_SIZE_MB` (default 10) and the MIME/extension allowlist in
 * `ml.controller.js`. Validating here gives instant feedback; the backend
 * remains the source of truth.
 */
const MAX_FILE_MB = 10;
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "bmp", "tif", "tiff"]);

export function validateImageFile(file: File): string | null {
  const ext = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase()
    : "";
  const mimeOk = file.type ? file.type.startsWith("image/") : false;
  if (!mimeOk && !ALLOWED_EXTENSIONS.has(ext)) {
    return "Unsupported file type. Allowed: JPEG, PNG, WebP, BMP, TIFF.";
  }
  if (file.size === 0) return "The selected file is empty.";
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    return `The image exceeds the maximum allowed size of ${MAX_FILE_MB}MB.`;
  }
  return null;
}

export function Dropzone({
  onFileSelected,
  disabled = false,
}: {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = [...ALLOWED_EXTENSIONS].map((ext) => `.${ext}`).join(",");

  const handleFile = useCallback(
    (file: File | undefined | null) => {
      if (!file) return;
      const problem = validateImageFile(file);
      if (problem) {
        setError(problem);
        return;
      }
      setError(null);
      onFileSelected(file);
    },
    [onFileSelected],
  );

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!disabled) handleFile(event.dataTransfer.files?.[0]);
        }}
        aria-label="Choose a hazy image to upload"
        className={`flex w-full flex-col items-center justify-center gap-2 rounded-box border border-dashed px-6 py-10 text-center transition-colors ${
          dragging
            ? "border-base-content/50 bg-base-200"
            : "border-base-300 hover:border-base-content/30 hover:bg-base-200/50"
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-base-content/50" aria-hidden="true">
          <path
            d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 16.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="text-sm font-medium">
          Drop a hazy image here, or <span className="underline underline-offset-2">browse</span>
        </p>
        <p className="text-xs text-base-content/50">
          JPEG, PNG, WebP, BMP, TIFF · up to {MAX_FILE_MB}MB
        </p>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {error && (
        <p role="alert" className="mt-2 text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}