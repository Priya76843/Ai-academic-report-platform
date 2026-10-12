export function ProgressBar({ value, indeterminate = false, tone = "accent" }: { value?: number; indeterminate?: boolean; tone?: "accent" | "ok" }) {
  const color = tone === "ok" ? "bg-ok" : "bg-accent";
  return (
    <div className="h-1.5 w-full min-w-20 overflow-hidden rounded-sm bg-surface-3" role="progressbar" aria-valuenow={value}>
      <div className={`h-full rounded-sm ${color} ${indeterminate ? "w-1/3 animate-[slide_1.4s_ease-in-out_infinite]" : ""}`} style={indeterminate ? undefined : { width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} />
    </div>
  );
}
