function CTA() {
  return (
    <section className="bg-white px-6 py-24">
      <div className="mx-auto max-w-6xl">
        {/* CTA box */}
        <div className="relative overflow-hidden rounded-3xl bg-indigo-600 px-8 py-16 text-center md:px-16">
          {/* Background  */}
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-indigo-900/20 blur-3xl" />
          {/* content */}
          <div className="relative z-10 mx-auto max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-200">
              Ready to get started?
            </p>
            <h2 className="mt-4 text-4xl font-bold text-white md:text-5xl">
              Build your academic report with AI
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-indigo-100">
              Bring your research material, project evidence, and required report format into one workspace. Generate, review, improve, and export your report with confidence.
            </p>
            {/* CTA buttons */}
            <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
              <button
                type="button"
                className="rounded-xl bg-white px-7 py-3.5 font-semibold text-indigo-600 hover:bg-gray-100"
              >
                Create Your Project
              </button>
              <a
                href="#how-it-works"
                className="rounded-xl border border-white/30 bg-white/10 px-7 py-3.5 font-semibold text-white hover:bg-white/20"
              >
                Explore the Workflow
              </a>
            </div>
            {/* Points */}
            <p className="mt-8 text-sm text-indigo-100">
              Create your project, review the generated content, and export your report when it is ready.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
export default CTA;
