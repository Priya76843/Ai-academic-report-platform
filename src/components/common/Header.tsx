function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div>
        <p className="text-sm font-semibold text-gray-900">
          AI Academic Workspace
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600">
          P
        </div>

        <div className="hidden sm:block">
          <p className="text-sm font-medium text-gray-900">
            Priya
          </p>
          <p className="text-xs text-gray-500">
            Student
          </p>
        </div>
      </div>
    </header>
  )
}

export default Header