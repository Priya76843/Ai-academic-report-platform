import {
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queries } from "@/lib/api/queries";
import type { Project } from "@/lib/api/types";
import {
  getTrackedJobs,
  subscribeToJobs,
} from "@/lib/jobs/jobRegistry";

type StepState = "done" | "current" | "locked";

const steps = [
  { key: "setup", label: "Setup", path: "setup" },
  { key: "sources", label: "Sources", path: "sources" },
  { key: "plan", label: "Plan", path: "plan" },
  { key: "chapters", label: "Chapters", path: "sections" },
  { key: "final-review", label: "Final review", path: "final-review" },
  { key: "export", label: "Export", path: "export" },
] as const;

const ACTIVE_JOB_STATUSES = new Set(["QUEUED", "RUNNING", "RETRYING"]);

function getStepStates(
  project: Project,
  canContinueToPlan: boolean,
): Record<string, StepState> {
  const status = project.status;

  // A DRAFT project is complete at Setup only after its college is provided.
  const setupDone =
    status !== "DRAFT" ||
    Boolean(project.details.institution?.college);

  const planReady = [
    "PLAN_READY",
    "GENERATING",
    "IN_REVIEW",
    "ALL_SECTIONS_APPROVED",
    "QUALITY_REVIEW",
    "COMPILING",
    "COMPLETED",
  ].includes(status);

  const chaptersDone =
    project.sections_total > 0 &&
    project.sections_approved === project.sections_total;

  const reviewDone = [
    "ALL_SECTIONS_APPROVED",
    "QUALITY_REVIEW",
    "COMPILING",
    "COMPLETED",
  ].includes(status);

  const exportDone = status === "COMPLETED";

  return {
    setup: setupDone ? "done" : "current",

    sources: canContinueToPlan
      ? "done"
      : setupDone
        ? "current"
        : "locked",

    plan: planReady
      ? "done"
      : canContinueToPlan
        ? "current"
        : "locked",

    chapters: chaptersDone
      ? "done"
      : planReady
        ? "current"
        : "locked",

    "final-review": reviewDone
      ? "done"
      : chaptersDone
        ? "current"
        : "locked",

    export: exportDone
      ? "done"
      : reviewDone
        ? "current"
        : "locked",
  };
}

function StepGlyph({ state }: { state: StepState }) {
  if (state === "done") {
    return <span aria-label="Done">{"\u2713"}</span>;
  }

  if (state === "current") {
    return <span aria-label="Current">{"\u25CF"}</span>;
  }

  return <span aria-label="Locked">{"\u25CB"}</span>;
}

function ProjectNavigation({ project }: { project: Project }) {
  const location = useLocation();

  const sourcesQuery = useQuery({
    ...queries.sources(project.id),
  });

  const states = getStepStates(
    project,
    sourcesQuery.data?.readiness.can_continue_to_plan === true,
  );

  return (
    <nav aria-label="Project steps" className="flex flex-col gap-1 p-2">
      {steps.map((step) => {
        const state = states[step.key];

        const current =
          location.pathname.includes(
            `/projects/${project.id}/${step.path}`,
          ) ||
          (step.key === "chapters" &&
            location.pathname.includes(
              `/projects/${project.id}/sections/`,
            ));

        const content = (
          <>
            <StepGlyph state={current ? "current" : state} />
            <span>{step.label}</span>
          </>
        );

        if (state === "locked") {
          return (
            <div
              key={step.key}
              aria-disabled="true"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-ink-3"
            >
              {content}
            </div>
          );
        }

        // The router currently has no /sections index route. Keep Chapters visible, but do not link to a nonexistent page.
        if (step.key === "chapters") {
          return (
            <div
              key={step.key}
              aria-current={current ? "step" : undefined}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                current
                  ? "bg-accent-soft font-semibold text-accent"
                  : "text-ink-2"
              }`}
            >
              {content}
            </div>
          );
        }

        return (
          <NavLink
            key={step.key}
            to={`/projects/${project.id}/${step.path}`}
            aria-current={current ? "step" : undefined}
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                isActive || current
                  ? "bg-accent-soft font-semibold text-accent"
                  : "text-ink-2 hover:bg-surface-3"
              }`
            }
          >
            {content}
          </NavLink>
        );
      })}
    </nav>
  );
}

function Breadcrumb({ project }: { project?: Project }) {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);
  const current = segments.at(-1) ?? "Projects";

  const label =
    steps.find((step) => step.path === current)?.label ??
    (current === "projects" ? "Projects" : current);

  return (
    <div className="min-w-0 truncate text-sm text-ink-2">
      <NavLink to="/projects" className="hover:text-ink">
        Projects
      </NavLink>

      {project && (
        <>
          <span className="mx-2 text-ink-3">/</span>
          <span className="text-ink">{project.title}</span>
          <span className="mx-2 text-ink-3">/</span>
          <span>{label}</span>
        </>
      )}
    </div>
  );
}

function JobsTray({ projectId }: { projectId?: string }) {
  const [open, setOpen] = useState(false);

  // TODO(B-04): Replace the local registry with a backend active-jobs endpoint so jobs from other sessions remain visible after refresh.
  const trackedJobs = useSyncExternalStore(
    subscribeToJobs,
    getTrackedJobs,
    getTrackedJobs,
  );

  const activeJobs = trackedJobs.filter(
    (job) =>
      job.projectId === (projectId ?? null) &&
      ACTIVE_JOB_STATUSES.has(job.status),
  );

  useEffect(() => {
    setOpen(false);
  }, [projectId]);

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="active-jobs-panel"
        onClick={() => setOpen((value) => !value)}
        className="rounded-md border border-line px-3 py-2 text-sm text-ink-2 hover:bg-surface-3"
      >
        {activeJobs.length === 0
          ? "All caught up"
          : `${activeJobs.length} jobs running`}
      </button>

      {open && (
        <div
          id="active-jobs-panel"
          className="absolute right-0 top-full z-30 mt-2 w-72 rounded-lg border border-line bg-surface p-3 shadow-lg"
        >
          <h2 className="mb-2 text-sm font-semibold">Active jobs</h2>

          {activeJobs.length === 0 ? (
            <p className="text-sm text-ink-3">
              All caught up. No active jobs.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {activeJobs.map((job) => (
                <li
                  key={job.jobId}
                  className="flex flex-col gap-1 text-sm"
                >
                  <span className="break-words text-ink">
                    {job.jobType.replaceAll("_", " ")}
                  </span>
                  <span className="text-xs text-ink-3">
                    {job.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function AppShell() {
  const { projectId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const projectQuery = useQuery({
    ...queries.project(projectId ?? ""),
    enabled: Boolean(projectId),
  });

  const project = projectQuery.data;

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await api<void>("/auth/logout", { method: "POST" });
    } catch {
      // Leave the protected area even if the logout request fails.
    } finally {
      queryClient.clear();
      navigate("/login", { replace: true });
    }
  }

  const sidebar = (
    <>
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-4">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-accent font-doc text-lg text-white">
          A
        </span>

        <div className="text-[13.5px] font-semibold leading-tight">
          Documentation Platform
          <small className="block text-[11px] font-normal text-ink-3">
            Final-year project workspace
          </small>
        </div>
      </div>

      {project ? (
        <>
          <div className="border-b border-line px-4 py-4">
            <NavLink
              to="/projects"
              className="text-xs text-ink-3 hover:text-ink"
            >
              {"\u2190"} All projects
            </NavLink>

            <h2 className="mt-3 break-words text-sm font-semibold text-ink">
              {project.title}
            </h2>

            <p className="mt-1 text-xs text-ink-3">
              {project.report_type.replaceAll("_", " ")}
              {project.target_pages != null
                ? ` \u00B7 ${project.target_pages} pages`
                : ""}
            </p>
          </div>

          <ProjectNavigation project={project} />
        </>
      ) : (
        <nav
          aria-label="Main navigation"
          className="flex flex-col gap-1 p-2"
        >
          <NavLink
            to="/projects"
            end
            className={({ isActive }) =>
              `rounded-md px-3 py-2 text-sm ${
                isActive
                  ? "bg-accent-soft font-semibold text-accent"
                  : "text-ink-2 hover:bg-surface-3"
              }`
            }
          >
            Projects
          </NavLink>

          <div
            aria-disabled="true"
            className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-ink-3"
          >
            <span>Templates library</span>
            <small className="text-xs">Slice 2+</small>
          </div>

          <div
            aria-disabled="true"
            className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-ink-3"
          >
            <span>Usage</span>
            <small className="text-xs">Slice 2+</small>
          </div>
        </nav>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="min-[761px]:grid min-[761px]:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-screen overflow-y-auto border-r border-line bg-surface min-[761px]:block">
          {sidebar}
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-40 min-[761px]:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileOpen(false)}
            />

            <aside className="relative z-10 h-full w-[min(290px,85vw)] overflow-y-auto border-r border-line bg-surface shadow-xl">
              {sidebar}
            </aside>
          </div>
        )}

        <div className="min-w-0">
          <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label={
                  mobileOpen ? "Close navigation" : "Open navigation"
                }
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen((value) => !value)}
                className="rounded-md border border-line px-3 py-2 text-sm min-[761px]:hidden"
              >
                {mobileOpen ? "\u2715" : "\u2630"}
              </button>

              <Breadcrumb project={project} />
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <JobsTray projectId={projectId} />

              <div
                aria-label="User profile"
                title="User profile"
                className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent"
              >
                U
              </div>

              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={loggingOut}
                className="rounded-md border border-line px-3 py-2 text-sm text-ink-2 hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loggingOut ? "Signing out..." : "Log out"}
              </button>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1440px] p-4 sm:p-6">
            {projectId && projectQuery.isPending ? (
              <p className="text-sm text-ink-3">Loading project...</p>
            ) : projectId && projectQuery.isError ? (
              <p role="alert" className="text-sm text-red-600">
                Unable to load this project. Please refresh or return to Projects.
              </p>
            ) : (
              <Outlet />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
