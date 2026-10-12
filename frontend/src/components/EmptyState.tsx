import type { ReactNode } from "react";

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-line px-5 py-10 text-center">
      <h3 className="text-[15px] font-semibold">{title}</h3>
      {children && <p className="max-w-[44ch] text-[13px] text-ink-2">{children}</p>}
      {action}
    </div>
  );
}
