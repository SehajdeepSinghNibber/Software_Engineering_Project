/** Brand mark — a lens aperture. Rendered from geometry, no image asset. */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle cx="16" cy="16" r="12.75" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="16" r="5.25" fill="currentColor" />
      <path
        d="M16 3.25A12.75 12.75 0 0 1 28.75 16"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({
  className = "",
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-7 w-7" />
      {showWordmark && (
        <span className="text-lg font-semibold tracking-tight">ClearLens</span>
      )}
    </span>
  );
}