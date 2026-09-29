function Hero() {
  return (
    <section className="bg-white px-6 py-20">
      <div className="mx-auto max-w-7xl">
        {/* Hero section */}
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-700">
             AI-powered academic report workspace
          </div>
          <h1 className="text-5xl font-bold leading-tight text-gray-950 md:text-6xl lg:text-7xl">
            Turn your academic work into a
            <span className="text-indigo-600"> structured report</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
            Upload your research material, configure your institution&apos;s report structure, and let specialized AI agents generate source-grounded sections you can review, revise, and approve.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
            <button
              type="button"
              className="rounded-xl bg-indigo-600 px-7 py-3.5 font-semibold text-white hover:bg-indigo-700"
            >
              Create Your Report
            </button>
            <a
              href="#how-it-works"
              className="rounded-xl border border-gray-300 px-7 py-3.5 font-semibold text-gray-800 hover:bg-gray-50"
            >
              See How It Works
            </a>
          </div>
          <p className="mt-5 text-sm text-gray-500">
            Create your report, review the content, and export it when ready.
          </p>
        </div>
      </div>
    </section>
  );
}
export default Hero;
