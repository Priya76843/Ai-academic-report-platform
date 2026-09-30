function ProjectsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-950">
        Projects
      </h1>

      <p className="mt-2 text-sm text-gray-600">
        Your academic projects will appear here.
      </p>

      <div className="mt-8 rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="text-sm font-medium text-gray-700">
          No projects yet
        </p>

        <p className="mt-1 text-sm text-gray-500">
          Create your first academic project to get started.
        </p>
      </div>
    </div>
  )
}

export default ProjectsPage