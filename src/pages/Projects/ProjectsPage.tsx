import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import ProjectCard from "../../components/projects/ProjectCard"
import { getProjects } from "../../services/projectService"
import type { Project } from "../../types/project"

const PAGE_SIZE = 2

function ProjectsPage() {
  const navigate = useNavigate()

  const [projects, setProjects] = useState<Project[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadProjects = useCallback(async (pageToLoad: number) => {
    setError("")
    setLoading(true)

    try {
      const response = await getProjects(pageToLoad, PAGE_SIZE)

      // Replace the list only after a successful response.
      setProjects(response.items)
      setPage(response.page)
      setTotal(response.total)
    } catch (err) {
      // Preserve the last successful project list.
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load projects. Please try again.",
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProjects(page)
  }, [loadProjects, page])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || loading) {
      return
    }

    setPage(nextPage)
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-950">
            Projects
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Create, manage, and track your academic reports.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate("/projects/new")}
            className="rounded-lg bg-gray-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            New project
          </button>

          
        </div>
      </div>

      {loading && (
        <div
          role="status"
          className="mt-8 rounded-xl border border-gray-200 bg-white p-8 text-center"
        >
          <p className="text-sm text-gray-600">
            Loading projects...
          </p>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6"
        >
          <p className="text-sm font-medium text-red-800">
            Unable to load projects
          </p>

          <p className="mt-1 text-sm text-red-700">{error}</p>

          <button
            type="button"
            onClick={() => void loadProjects(page)}
            disabled={loading}
            className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && projects.length === 0 && (
        <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-sm font-medium text-gray-700">
            No projects yet
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Create your first academic project to get started.
          </p>

          <button
            type="button"
            onClick={() => navigate("/projects/new")}
            className="mt-5 rounded-lg bg-gray-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            Create project
          </button>
        </div>
      )}

      {/* Do not hide previously loaded cards when an error occurs. */}
      {projects.length > 0 && (
        <>
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600">
              Showing {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, total)} of {total} projects
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1 || loading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages || loading}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default ProjectsPage
