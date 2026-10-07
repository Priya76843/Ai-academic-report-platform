import { NavLink } from "react-router-dom"

interface SidebarProps {
  mobile?: boolean
  onClose?: () => void
}

function Sidebar({ mobile = false, onClose }: SidebarProps) {
  return (
    <aside
      className={
        mobile
          ? "flex h-full w-72 flex-col bg-white"
          : "hidden w-64 border-r border-gray-200 bg-white md:flex md:flex-col"
      }
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-6">
        <span className="text-lg font-bold text-gray-950">
          Academic AI
        </span>

        {mobile && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            aria-label="Close navigation"
          >
            ✕
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Workspace
        </p>

        <div className="space-y-1">
          <NavLink
            to="/dashboard"
            onClick={onClose}
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
            onClick={onClose}
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