import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate } from "react-router-dom"

import { projectSchema } from "../../schemas/projectSchema"
import type { ProjectFormValues } from "../../schemas/projectSchema"
import {
  ApiError,
  createProject,
} from "../../services/projectService"

function NewProjectForm() {
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState("")

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      report_type: "PROJECT_REPORT",
      title: "",
      topic: "",
      description: "",
      target_pages: 55,
      citation_style: "IEEE",
    },
  })

  const onSubmit = async (data: ProjectFormValues) => {
    setSubmitError("")
    clearErrors()

    try {
      const idempotencyKey = crypto.randomUUID()

      const project = await createProject(data, idempotencyKey)

      navigate(`/projects/${project.id}/setup`)
    } catch (error) {
      if (error instanceof ApiError) {
        if (
          error.code === "VALIDATION_ERROR" &&
          error.details?.fields
        ) {
          Object.entries(error.details.fields).forEach(
            ([field, message]) => {
              if (
                field === "report_type" ||
                field === "title" ||
                field === "topic" ||
                field === "description" ||
                field === "target_pages" ||
                field === "citation_style"
              ) {
                setError(field, {
                  type: "server",
                  message,
                })
              }
            },
          )

          return
        }

        setSubmitError(error.message)
        return
      }

      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to create project. Please try again.",
      )
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-6"
    >
      {submitError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {submitError}
        </div>
      )}

      {/* Report Type */}
      <div>
        <label
          htmlFor="report_type"
          className="mb-2 block text-sm font-medium text-gray-800"
        >
          Report type
        </label>

        <select
          id="report_type"
          {...register("report_type")}
          disabled={isSubmitting}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-900 disabled:cursor-not-allowed disabled:bg-gray-100"
        >
          <option value="PROJECT_REPORT">
            Project report
          </option>

          <option value="SEMINAR_REPORT">
            Seminar report
          </option>
        </select>

        <p className="mt-1 text-xs text-gray-500">
          Seminar reports skip source code and screenshots.
        </p>

        {errors.report_type && (
          <p className="mt-1 text-xs text-red-600">
            {errors.report_type.message}
          </p>
        )}
      </div>

      {/* Project Title */}
      <div>
        <label
          htmlFor="title"
          className="mb-2 block text-sm font-medium text-gray-800"
        >
          Project title
        </label>

        <input
          id="title"
          type="text"
          placeholder="Enter your project title"
          autoComplete="off"
          {...register("title")}
          disabled={isSubmitting}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-900 disabled:cursor-not-allowed disabled:bg-gray-100"
        />

        {errors.title && (
          <p className="mt-1 text-xs text-red-600">
            {errors.title.message}
          </p>
        )}
      </div>

      {/* Topic */}
      <div>
        <label
          htmlFor="topic"
          className="mb-2 block text-sm font-medium text-gray-800"
        >
          Topic in one line
        </label>

        <input
          id="topic"
          type="text"
          placeholder="Enter your project topic"
          autoComplete="off"
          {...register("topic")}
          disabled={isSubmitting}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-900 disabled:cursor-not-allowed disabled:bg-gray-100"
        />

        {errors.topic && (
          <p className="mt-1 text-xs text-red-600">
            {errors.topic.message}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="mb-2 block text-sm font-medium text-gray-800"
        >
          What the project does
          <span className="ml-1 font-normal text-gray-500">
            (optional)
          </span>
        </label>

        <textarea
          id="description"
          rows={4}
          placeholder="Briefly describe what your project does"
          {...register("description")}
          disabled={isSubmitting}
          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-900 disabled:cursor-not-allowed disabled:bg-gray-100"
        />

        <p className="mt-1 text-xs text-gray-500">
          Used as project context by every chapter writer. Specific
          beats long.
        </p>

        {errors.description && (
          <p className="mt-1 text-xs text-red-600">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Target Pages + Citation Style */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Target Pages */}
        <div>
          <label
            htmlFor="target_pages"
            className="mb-2 block text-sm font-medium text-gray-800"
          >
            Target pages
          </label>

          <input
            id="target_pages"
            type="number"
            min={10}
            max={300}
            {...register("target_pages", {
              setValueAs: (value) =>
                value === "" ? undefined : Number(value),
            })}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-900 disabled:cursor-not-allowed disabled:bg-gray-100"
          />

          {errors.target_pages && (
            <p className="mt-1 text-xs text-red-600">
              {errors.target_pages.message}
            </p>
          )}
        </div>

        {/* Citation Style */}
        <div>
          <label
            htmlFor="citation_style"
            className="mb-2 block text-sm font-medium text-gray-800"
          >
            Citation style
          </label>

          <select
            id="citation_style"
            {...register("citation_style")}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-900 disabled:cursor-not-allowed disabled:bg-gray-100"
          >
            <option value="IEEE">IEEE</option>
            <option value="APA">APA</option>
          </select>

          {errors.citation_style && (
            <p className="mt-1 text-xs text-red-600">
              {errors.citation_style.message}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
        <button
          type="button"
          onClick={() => navigate("/projects")}
          disabled={isSubmitting}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-gray-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Creating..." : "Create project"}
        </button>
      </div>
    </form>
  )
}

export default NewProjectForm

