type Step = {
  number: string
  title: string
  description: string
  label: string
}
function HowItWorks() {
  const steps: Step[] = [
    {
      number:'01',
      title:'Bring Your Material',
      description:'Upload research papers, PDFs, screenshots, notes, datasets, code, and other project evidence.',
      label:'Sources',
    },
    {
      number:'02',
      title:'AI Understands',
      description:'The platform analyzes your sources and understands the report format, requirements, and available evidence.',
      label:'Understand',
    },
    {
      number:'03',
      title:'Build the Report Plan',
      description:'The AI planner creates the report structure, section requirements, dependencies, and generation workflow.',
      label:'Plan',
    },
    {
      number:'04',
      title:'Generate Each Section',
      description:'Specialized section agents create grounded content using the right sources and approved context for each section.',
      label:'Generate',
    },
    {
      number:'05',
      title:'You Review',
      description:'Edit, approve, reject, or request revisions. Approved sections are locked so you stay in control.',
      label:'Review',
    },
    {
      number:'06',
      title:'QA & Export',
      description:'Final AI checks improve consistency, grammar, citations, and structure before your report is assembled and exported.',
      label:'Export',
    },
  ]
  return (
    <section id="how-it-works" className="bg-gray-50 px-6 py-24">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
            How it works
          </p>
          <h2 className="mt-6 text-4xl font-bold text-gray-950 md:text-5xl">
            From your research to a
            <span className="text-indigo-600"> finished report</span>
          </h2>
          <p className="mt-5 text-lg leading-8 text-gray-600">
            A structured workflow where AI handles the work while you stay in control of the final academic content.
          </p>
        </div>
        {/*All steps */}
        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="rounded-2xl border border-gray-200 bg-white p-7 hover:border-indigo-200 hover:shadow-lg"
            >
              {/* Step number */}
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
                  {step.number}
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {step.label}
                </span>
              </div>
              {/* Step content */}
              <h3 className="mt-7 text-xl font-semibold text-gray-950">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-gray-600">
                {step.description}
              </p>
            </div>
          ))}
        </div>
        {/* Workflow summary */}
        <div className="mt-16 rounded-2xl border border-gray-200 bg-white p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-md">
              <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
                Complete workflow
              </p>
              <h3 className="mt-3 text-2xl font-bold text-gray-950">
                One connected academic workflow
              </h3>
              <p className="mt-3 text-sm leading-7 text-gray-600">
                Your sources stay connected to the generated report so you can review the content and maintain control throughout the process.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {steps.map((step, index) => (
                <div
                  key={step.label}
                  className="flex items-center gap-2"
                >
                  <span className="rounded-xl bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 ring-1 ring-gray-200">
                    {step.label}
                  </span>
                  {index < steps.length - 1 && (
                    <span className="text-indigo-500">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Last bit message */}
        <div className="mt-10 text-center">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-700">
              AI generates.
            </span>{' '}
            <span className="font-semibold text-gray-700">
              You decide.
            </span>{' '}
            Your academic work stays under your control.
          </p>
        </div>
      </div>
    </section>
  )
}
export default HowItWorks