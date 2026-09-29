function Features() {
  const features = [
    {
      number:'01',
      title:'Source-Grounded Generation',
      description:'Generate content using your uploaded papers, notes, screenshots, and project evidence.',
    },
    {
      number: '02',
      title: 'Dynamic Section Agents',
      description:'Each report section uses a specialized AI workflow based on its requirements.',
    },
    {
      number:'03',
      title:'Institution-Specific Formats',
      description:'Set your chapters, sections, page targets, and report structure according to your institution.',
    },
    {
      number:'04',
      title:'Human Review & Revision',
      description:'Review generated sections, make changes, give feedback, and approve the content.',
    },
    {
      number:'05',
      title:'Cross-Section Quality Assurance',
      description:'Check the complete report for repetition, contradictions, unsupported claims, grammar, and consistency.',
    },
    {
      number:'06',
      title:'Ready-to-Export Reports',
      description:'Combine approved sections into a structured report and export the final document.',
    },
  ]
  return (
    <section id="features" className="bg-gray-50 px-6 py-24">
      <div className="mx-auto max-w-7xl">
        {/* Section heading */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
            Features
          </p>
          <h2 className="mt-4 text-4xl font-bold text-gray-950 md:text-5xl">
            Everything your academic report needs
          </h2>
          <p className="mt-5 text-lg leading-8 text-gray-600">
            Manage your sources, generate report sections, review the content, and prepare your final report in one workspace.
          </p>
        </div>
        {/* Feature cards */}
        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.number}
              className="rounded-2xl border border-gray-200 bg-white p-7 hover:border-indigo-200 hover:shadow-lg"
            >
              <span className="text-sm font-bold text-indigo-600">
                {feature.number}
              </span>
              <h3 className="mt-6 text-xl font-semibold text-gray-950">
                {feature.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
        {/* Down messages */}
        <div className="mt-12 rounded-2xl border border-indigo-100 bg-indigo-50 p-6 text-center">
          <p className="text-sm font-medium text-indigo-700">
            Your report, your control
          </p>
          <p className="mt-2 text-xl font-semibold text-gray-950">
            AI helps create the report. You make the final decisions.
          </p>
        </div>

      </div>
    </section>
  )
}
export default Features

