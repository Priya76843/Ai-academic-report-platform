import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import ProjectCard from "../../components/projects/ProjectCard"
import { getProjects } from "../../services/projectService"
import type { Project } from "../../types/project"

function ProjectsPage() {
  const navigate = useNavigate()

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadProjects = async () => {
    setError("")

    try {
      const response = await getProjects()

      setProjects(response.items)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to load projects.",
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

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

        <button
          type="button"
          onClick={() => navigate("/projects/new")}
          className="rounded-lg bg-gray-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          New project
        </button>
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

      {!loading && error && (
        <div
          role="alert"
          className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6"
        >
          <p className="text-sm font-medium text-red-800">
            Unable to load projects
          </p>

          <p className="mt-1 text-sm text-red-700">
            {error}
          </p>

          <button
            type="button"
            onClick={loadProjects}
            className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
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

      {!loading && !error && projects.length > 0 && (
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default ProjectsPage