import type { AnyStatus } from "@/lib/api/types";

const TONE: Record<string, string> = {
  APPROVED: "ok", READY: "ok", SUCCEEDED: "ok", COMPLETED: "ok", ALL_SECTIONS_APPROVED: "ok",
  IN_REVIEW: "warn", NEEDS_UPLOAD: "warn",
  FAILED: "err", INGESTION_FAILED: "err", GENERATION_FAILED: "err", EXPORT_FAILED: "err",
  GENERATING: "busy", REGENERATING: "busy", PROCESSING: "busy", RESOLVING: "busy", RUNNING: "busy",
  RETRYING: "busy", UPLOADING: "busy", INGESTING: "busy", COMPILING: "busy", QUALITY_REVIEW: "busy",
};
const CLASS: Record<string, string> = {
  ok: "bg-ok-soft text-ok", warn: "bg-warn-soft text-warn", err: "bg-err-soft text-err",
  busy: "bg-accent-soft text-accent", neutral: "bg-surface-3 text-ink-2",
};

export function StatusPill({ status, className = "" }: { status: AnyStatus | string; className?: string }) {
  const tone = TONE[status] ?? "neutral";
  return (
    <span data-tone={tone} className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${CLASS[tone]} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${tone === "busy" ? "animate-pulse" : ""}`} />
      {status.replace(/_/g, " ")}
    </span>
  );
}
