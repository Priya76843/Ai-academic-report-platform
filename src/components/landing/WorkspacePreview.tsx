type ReportSection = {
  name: string
  status: "Approved" | "Generating" | "Pending"
}

function WorkspacePreview() {
  const sections: ReportSection[] = [
    { name: "Introduction", status: "Approved" },
    { name: "Literature Survey", status: "Approved" },
    { name: "Methodology", status: "Generating" },
    { name: "Implementation", status: "Pending" },
    { name: "Results", status: "Pending" },
  ]

  return (
    <section id="workspace" className="bg-white px-6 py-24">
      <div className="mx-auto max-w-7xl">

        {/* Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
            Workspace Preview
          </p>

          <h2 className="mt-4 text-4xl font-bold text-gray-950 md:text-5xl">
            Your report, all in one workspace
          </h2>

          <p className="mt-5 text-lg leading-8 text-gray-600">
            Manage your sources, report sections, generation progress and
            review from one place.
          </p>
        </div>

        {/* Dark workspace card */}
        <div className="mt-16 overflow-hidden rounded-2xl bg-gray-900">

          {/* Header */}
          <div className="border-b border-gray-800 px-6 py-5">
            <p className="text-sm text-gray-500">
              AI Academic Workspace
            </p>

            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-xl font-semibold text-white">
                Smart Agriculture Detection System
              </h3>

              <span className="w-fit rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400">
                Generation active
              </span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row">

            {/* Sidebar */}
            <div className="border-b border-gray-800 p-5 md:w-56 md:border-b-0 md:border-r">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-600">
                Workspace
              </p>

              <div className="space-y-2">
                <div className="rounded-lg bg-indigo-500/10 px-3 py-2 text-sm font-medium text-indigo-400">
                  Report Sections
                </div>

                <div className="px-3 py-2 text-sm text-gray-500">
                  Project Overview
                </div>

                <div className="px-3 py-2 text-sm text-gray-500">
                  Sources
                </div>

                <div className="px-3 py-2 text-sm text-gray-500">
                  Review
                </div>

                <div className="px-3 py-2 text-sm text-gray-500">
                  Export
                </div>
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 p-6">

              {/* Stats */}
              <div className="grid gap-4 sm:grid-cols-3">

                <div className="rounded-xl border border-gray-800 bg-gray-950 p-5">
                  <p className="text-2xl font-bold text-white">24</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Sources
                  </p>
                </div>

                <div className="rounded-xl border border-gray-800 bg-gray-950 p-5">
                  <p className="text-2xl font-bold text-white">5</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Sections
                  </p>
                </div>

                <div className="rounded-xl border border-gray-800 bg-gray-950 p-5">
                  <p className="text-2xl font-bold text-white">2</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Approved
                  </p>
                </div>

              </div>

              {/* Report sections */}
              <div className="mt-6 rounded-xl border border-gray-800 bg-gray-950 p-5">

                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-white">
                    Report Sections
                  </h4>

                  <span className="text-sm text-gray-500">
                    2 of 5 approved
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {sections.map((section) => {
                    let statusStyle = "bg-gray-800 text-gray-400"

                    if (section.status === "Approved") {
                      statusStyle = "bg-green-500/10 text-green-400"
                    }

                    if (section.status === "Generating") {
                      statusStyle = "bg-indigo-500/10 text-indigo-400"
                    }

                    return (
                      <div
                        key={section.name}
                        className="flex items-center justify-between rounded-lg border border-gray-800 px-4 py-3"
                      >
                        <span className="text-sm text-gray-300">
                          {section.name}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyle}`}
                        >
                          {section.status}
                        </span>
                      </div>
                    )
                  })}
                </div>

              </div>

              {/* Current activity */}
              <div className="mt-6 rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-5">
                <p className="text-sm font-semibold text-indigo-400">
                  Section Agent
                </p>

                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Methodology is currently being generated using the sources
                  added to this project.
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default WorkspacePreview