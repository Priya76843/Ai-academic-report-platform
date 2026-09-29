function Navbar() {
  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <h1 className="text-xl font-bold">Academic AI</h1>
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