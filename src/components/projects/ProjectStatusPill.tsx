import type { ProjectStatus } from "../../types/project"

interface ProjectStatusPillProps {
  status: ProjectStatus
}

const statusLabels: Record<ProjectStatus, string> = {
  DRAFT: "Draft",
  INGESTING: "Ingesting",
  READY_FOR_PLANNING: "Ready for planning",
  PLAN_READY: "Plan ready",
  GENERATING: "Generating",
  IN_REVIEW: "In review",
  ALL_SECTIONS_APPROVED: "Approved",
  QUALITY_REVIEW: "Quality review",
  COMPILING: "Compiling",
  COMPLETED: "Completed",
  INGESTION_FAILED: "Ingestion failed",
  GENERATION_FAILED: "Generation failed",
  EXPORT_FAILED: "Export failed",
}

const statusClasses: Record<ProjectStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  INGESTING: "bg-blue-100 text-blue-700",
  READY_FOR_PLANNING: "bg-indigo-100 text-indigo-700",
  PLAN_READY: "bg-purple-100 text-purple-700",
  GENERATING: "bg-yellow-100 text-yellow-700",
  IN_REVIEW: "bg-orange-100 text-orange-700",
  ALL_SECTIONS_APPROVED: "bg-green-100 text-green-700",
  QUALITY_REVIEW: "bg-cyan-100 text-cyan-700",
  COMPILING: "bg-violet-100 text-violet-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  INGESTION_FAILED: "bg-red-100 text-red-700",
  GENERATION_FAILED: "bg-red-100 text-red-700",
  EXPORT_FAILED: "bg-red-100 text-red-700",
}

function ProjectStatusPill({ status }: ProjectStatusPillProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses[status]}`}
    >
      {statusLabels[status]}
    </span>
  )
}

export default ProjectStatusPill