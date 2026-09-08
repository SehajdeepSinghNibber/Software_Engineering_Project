/** Loading spinner with an optional centre label. */
export function Spinner({
  className = "loading-spinner",
}: {
  className?: string;
}) {
  return <span className={`loading ${className}`} aria-hidden="true" />;
}

export function CenteredLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-base-content/60"
      role="status"
      aria-live="polite"
    >
      <span className="loading loading-spinner text-base-content/70" />
      <p className="text-sm">{label}</p>
    </div>
  );
}