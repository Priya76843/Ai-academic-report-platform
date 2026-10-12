import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/EmptyState";
import { Note } from "@/components/Note";
import { StatusPill } from "@/components/StatusPill";
import { queries } from "@/lib/api/queries";

// F-04 builds the real cards, paging and new-project form. This proves the query/mocks/error path end to end.
export function ProjectsPage() {
  const q = useQuery(queries.projects());
  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
      {q.isPending && <p className="text-[13px] text-ink-3">Loading…</p>}
      {q.isError && <Note tone="err">Could not load projects. {q.error.message}</Note>}
      {q.data && q.data.items.length === 0 && <EmptyState title="No projects yet">Create a workspace, add your college format and papers, and build the report chapter by chapter.</EmptyState>}
      {q.data && q.data.items.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {q.data.items.map((p) => (
            <li key={p.id} className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4">
              <div className="flex items-center justify-between"><span className="font-mono text-[11px] text-ink-3">{p.report_type.replace("_", " ")}</span><StatusPill status={p.status} /></div>
              <div className="font-semibold">{p.title}</div>
              <div className="text-[12px] text-ink-3">{p.sections_approved} of {p.sections_total} chapters approved</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
