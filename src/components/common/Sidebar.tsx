import { NavLink } from "react-router-dom"

function Sidebar() {
  return (
    <aside className="hidden w-64 border-r border-gray-200 bg-white md:flex md:flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <span className="text-lg font-bold text-gray-950">
          Academic AI
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Workspace
        </p>

        <div className="space-y-1">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `block rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`
            }
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/projects"
            className={({ isActive }) =>
              `block rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`
            }
          >
            Projects
          </NavLink>
        </div>
      </nav>
    </aside>
  )
}

export default Sidebar