function Footer() {
  const currentYear: number = new Date().getFullYear()
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* Footer content */}
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
                AI
              </div>
              <h2 className="text-lg font-bold text-gray-950">
                Academic AI
              </h2>
            </div>
            <p className="mt-4 max-w-md text-sm leading-7 text-gray-600">
              An AI-powered workspace that helps students create academic reports from their research material and project information.
            </p>
            <p className="mt-4 text-sm text-gray-500">
              Create your report, review the content, and export it when ready.
            </p>
          </div>
          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold text-gray-950">
              Product
            </h3>
            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <a href="#features" className="block hover:text-indigo-600">
                Features
              </a>
              <a href="#how-it-works" className="block hover:text-indigo-600">
                How It Works
              </a>
              <a href="#workspace" className="block hover:text-indigo-600">
                Workspace
              </a>
            </div>
          </div>
          {/* Workflow */}
          <div>
            <h3 className="text-sm font-semibold text-gray-950">
              Workflow
            </h3>
            <div className="mt-4 space-y-3 text-sm text-gray-600">
              <p>Source Ingestion</p>
              <p>AI Section Agents</p>
              <p>Human Review</p>
              <p>Quality Assurance</p>
              <p>Report Export</p>
            </div>
          </div>
        </div>
        {/* Copyright */}
        <div className="mt-10 flex flex-col gap-4 border-t border-gray-200 pt-6 text-sm text-gray-500 md:flex-row md:items-center md:justify-between">
          <p>
            © Copyright {currentYear} Academic AI. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-indigo-600">
              Privacy
            </a>
            <a href="#" className="hover:text-indigo-600">
              Terms
            </a>
            <a href="#" className="hover:text-indigo-600">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
export default Footer