import type { ReactNode } from "react";

const TONE = {
  info: "bg-accent-soft", ok: "bg-ok-soft", warn: "bg-warn-soft", err: "bg-err-soft",
};
// Every message says what happened and what to do next. `meta` carries the job id / error category for support.
export function Note({ tone = "info", children, meta }: { tone?: keyof typeof TONE; children: ReactNode; meta?: string }) {
  return (
    <div role={tone === "err" ? "alert" : "status"} className={`flex flex-col gap-1 rounded-lg px-3 py-2.5 text-[13px] ${TONE[tone]}`}>
      <div>{children}</div>
      {meta && <span className="font-mono text-[11px] text-ink-3">{meta}</span>}
    </div>
  );
}
