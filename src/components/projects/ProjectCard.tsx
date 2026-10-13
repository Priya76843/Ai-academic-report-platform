import { useNavigate } from "react-router-dom"
import type { Project } from "../../types/project"
import ProjectStatusPill from "./ProjectStatusPill"

interface ProjectCardProps {
  project: Project
}

function getProjectAction(project: Project) {
  switch (project.status) {
    case "DRAFT":
      return {
        label: "Continue Setup",
        path: `/projects/${project.id}/setup`,
      }

    case "PLAN_READY":
    case "IN_REVIEW":
      return {
        label: "View Plan",
        path: `/projects/${project.id}/plan`,
      }

    case "COMPLETED":
      return {
        label: "Export Report",
        path: `/projects/${project.id}/export`,
      }

    default:
      return {
        label: "Back to Projects",
        path: "/projects",
      }
  }
}

function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate()

  const progress =
    project.sections_total > 0
      ? Math.round(
          (project.sections_approved / project.sections_total) * 100,
        )
      : 0

  const action = getProjectAction(project)

  const updatedDate = new Date(project.updated_at)

  const updatedText = Number.isNaN(updatedDate.getTime())
    ? "Recently updated"
    : `Updated ${updatedDate.toLocaleDateString()}`

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {project.report_type === "PROJECT_REPORT"
              ? "Project report"
              : "Seminar report"}
          </p>

          <h2 className="mt-1 truncate text-lg font-semibold text-gray-950">
            {project.title}
          </h2>
        </div>

        <ProjectStatusPill status={project.status} />
      </div>

      <div className="mt-4 space-y-2 text-sm text-gray-600">
        <p>
          <span className="font-medium text-gray-800">Template:</span>{" "}
          {project.template_name || "Not selected"}
        </p>

        <p>
          <span className="font-medium text-gray-800">Target pages:</span>{" "}
          {project.target_pages || "Not specified"}
        </p>

        <p>
          <span className="font-medium text-gray-800">Sources:</span>{" "}
          {project.source_counts.total}
        </p>

        <p>
          <span className="font-medium text-gray-800">Chapters:</span>{" "}
          {project.sections_approved}/{project.sections_total} approved
        </p>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gray-900 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="text-xs text-gray-500">{updatedText}</span>

        <button
          type="button"
          onClick={() => navigate(action.path)}
          className="rounded-lg bg-gray-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          {action.label}
        </button>
      </div>
    </article>
  )
}

export default ProjectCard