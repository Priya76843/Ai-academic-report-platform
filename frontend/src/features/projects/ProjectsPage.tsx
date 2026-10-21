import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { EmptyState } from "@/components/EmptyState";
import { Note } from "@/components/Note";
import { ProgressBar } from "@/components/ProgressBar";
import { StatusPill } from "@/components/StatusPill";
import { queries } from "@/lib/api/queries";
import type { Project } from "@/lib/api/types";

const PAGE_SIZE = 20;

function getProjectAction(project: Project) {
  switch (project.status) {
    case "DRAFT":
      return {
        label: "Continue setup",
        path: `/projects/${project.id}/setup`,
      };

    case "INGESTING":
    case "READY_FOR_PLANNING":
    case "INGESTION_FAILED":
      return {
        label: "View sources",
        path: `/projects/${project.id}/sources`,
      };

    case "GENERATING":
    case "GENERATION_FAILED":
    case "PLAN_READY":
    case "IN_REVIEW":
    case "ALL_SECTIONS_APPROVED":
    case "QUALITY_REVIEW":
      return {
        label: "View plan",
        path: `/projects/${project.id}/plan`,
      };

    case "COMPILING":
    case "EXPORT_FAILED":
    case "COMPLETED":
      return {
        label: "View export",
        path: `/projects/${project.id}/export`,
      };

    default:
      return {
        label: "Open project",
        path: `/projects/${project.id}/setup`,
      };
  }
}

function ProjectCard({ project }: { project: Project }) {
  const progress =
    project.sections_total > 0
      ? Math.round(
          (project.sections_approved / project.sections_total) * 100,
        )
      : 0;

  const action = getProjectAction(project);
  const updatedDate = new Date(project.updated_at);

  const updatedText = Number.isNaN(updatedDate.getTime())
    ? "Recently updated"
    : `Updated ${updatedDate.toLocaleDateString()}`;

  const sourceTotal = project.source_counts.total;
  const paperCount =
    project.source_counts.PAPER + project.source_counts.PAPER_LINK;

  const sourceSummary = [
    paperCount > 0 ? `${paperCount} papers` : null,
    project.source_counts.SOURCE_CODE > 0
      ? `${project.source_counts.SOURCE_CODE} code archive(s)`
      : null,
    project.source_counts.SCREENSHOT > 0
      ? `${project.source_counts.SCREENSHOT} screenshots`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="flex min-w-0 flex-col gap-4 rounded-xl border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-3">
            {project.report_type === "PROJECT_REPORT"
              ? "Project report"
              : "Seminar report"}
          </p>

          <h2 className="mt-1 break-words text-base font-semibold">
            {project.title}
          </h2>
        </div>

        <StatusPill status={project.status} className="shrink-0" />
      </div>

      <div className="flex flex-col gap-2 text-[13px] text-ink-2">
        <p>
          <span className="font-medium text-ink">Template:</span>{" "}
          {project.template_name || "Not selected"}
        </p>

        <p>
          <span className="font-medium text-ink">Target pages:</span>{" "}
          {project.target_pages ?? "Not specified"}
        </p>

        <p>
          <span className="font-medium text-ink">Sources:</span>{" "}
          {sourceTotal}
          {sourceSummary ? ` (${sourceSummary})` : ""}
        </p>

        <p>
          <span className="font-medium text-ink">
            Chapters approved:
          </span>{" "}
          {project.sections_approved} of {project.sections_total}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-ink-3">
          <span>Report progress</span>
          <span>{progress}%</span>
        </div>

        <ProgressBar
          value={progress}
          tone={progress === 100 ? "ok" : "accent"}
        />
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3">
        <span className="text-xs text-ink-3">{updatedText}</span>

        <Link
          to={action.path}
          className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
        >
          {action.label}
        </Link>
      </div>
    </article>
  );
}

export function ProjectsPage() {
  const [page, setPage] = useState(1);
  const q = useQuery(queries.projects(page));

  const totalPages = Math.max(
    1,
    Math.ceil((q.data?.total ?? 0) / PAGE_SIZE),
  );

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Projects
          </h1>

          <p className="mt-1 text-sm text-ink-2">
            Manage your reports and track their progress.
          </p>
        </div>

        <Link
          to="/projects/new"
          className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          + New project
        </Link>
      </div>

      {q.isPending && (
        <p className="text-[13px] text-ink-3" role="status">
          Loading projects...
        </p>
      )}

      {q.isError && (
        <Note tone="err">
          Could not load projects. {q.error.message}{" "}
          <button
            type="button"
            onClick={() => void q.refetch()}
            className="ml-2 font-semibold underline"
          >
            Try again
          </button>
        </Note>
      )}

      {q.data && q.data.items.length === 0 && (
        <EmptyState
          title="No projects yet"
          action={
            <Link
              to="/projects/new"
              className="mt-2 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
            >
              Create your first project
            </Link>
          }
        >
          Create a report workspace, add your college format and
          sources, and build your report chapter by chapter.
        </EmptyState>
      )}

      {q.data && q.data.items.length > 0 && (
        <>
          <p className="text-xs text-ink-3">
            {q.data.total}{" "}
            {q.data.total === 1 ? "project" : "projects"}
          </p>

          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {q.data.items.map((project) => (
              <li key={project.id} className="min-w-0">
                <ProjectCard project={project} />
              </li>
            ))}
          </ul>

          {q.data.total > PAGE_SIZE && (
            <nav
              aria-label="Project pagination"
              className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4"
            >
              <p className="text-sm text-ink-2">
                Page {q.data.page} of {totalPages}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPage((current) => Math.max(1, current - 1))
                  }
                  disabled={page <= 1 || q.isFetching}
                  className="rounded-lg border border-line px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPage((current) =>
                      Math.min(totalPages, current + 1),
                    )
                  }
                  disabled={page >= totalPages || q.isFetching}
                  className="rounded-lg border border-line px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
