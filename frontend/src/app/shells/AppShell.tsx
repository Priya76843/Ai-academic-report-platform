import { NavLink, Outlet } from "react-router-dom";

// Projects-level shell. F-02 adds the project-scoped six-step navigation and the jobs tray.
export function AppShell() {
  return (
    <div className="grid min-h-full grid-cols-1 md:grid-cols-[224px_minmax(0,1fr)]">
      <aside className="hidden flex-col border-r border-line bg-surface-2 md:flex">
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-4">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-accent font-doc text-lg text-white">A</span>
          <div className="text-[13.5px] font-semibold leading-tight">Documentation Platform<small className="block text-[11px] font-normal text-ink-3">Final-year project workspace</small></div>
        </div>
        <nav className="flex flex-col gap-0.5 p-2 text-[13px] font-medium text-ink-2">
          <NavLink to="/projects" className={({ isActive }) => `rounded-md px-2.5 py-2 ${isActive ? "bg-surface text-ink shadow-sm" : "hover:bg-surface-3"}`}>Projects</NavLink>
        </nav>
      </aside>
      <main className="min-w-0"><Outlet /></main>
    </div>
  );
}
