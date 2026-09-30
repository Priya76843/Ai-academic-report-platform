function Navbar() {
  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              AI
            </div>

            <h1 className="text-xl font-bold text-gray-950">
              Academic AI
            </h1>
          </div>
        </div>

        <div className="hidden gap-8 md:flex">
          <a href="#features">Features</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#workspace">Workspace</a>
        </div>

        <button className="rounded-lg bg-indigo-600 px-5 py-2.5 text-white">
          Get Started
        </button>
      </div>
    </nav>
  )
}

export default Navbar

