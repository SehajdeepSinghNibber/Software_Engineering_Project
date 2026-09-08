/** A single quiet data point — value in mono, label in small caps. */
export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-base-content/50">
        {label}
      </p>
      <p className="mt-1 truncate font-mono text-sm font-medium tracking-tight sm:text-base">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-base-content/50">{hint}</p>}
    </div>
  );
}