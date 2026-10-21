import { useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { Note } from "@/components/Note";
import { api, ApiError, newIdempotencyKey } from "@/lib/api/client";
import type { Project } from "@/lib/api/types";

const formSchema = z.object({
  report_type: z.enum(["PROJECT_REPORT", "SEMINAR_REPORT"]),
  title: z
    .string()
    .refine((value) => value.trim().length >= 5, {
      message: "Title must be at least 5 characters.",
    })
    .refine((value) => value.trim().length <= 255, {
      message: "Title must not exceed 255 characters.",
    }),
  topic: z
    .string()
    .refine((value) => value.trim().length > 0, {
      message: "Topic is required.",
    })
    .refine((value) => value.trim().length <= 500, {
      message: "Topic must not exceed 500 characters.",
    }),
  description: z.string().max(5000, {
    message: "Description must not exceed 5000 characters.",
  }),
  target_pages: z.string().refine(
    (value) => {
      const pages = Number(value);
      return (
        Number.isInteger(pages) &&
        pages >= 10 &&
        pages <= 300
      );
    },
    {
      message:
        "Target pages must be a whole number between 10 and 300.",
    },
  ),
  citation_style: z.enum(["IEEE", "APA"]),
});

type FormValues = z.infer<typeof formSchema>;

const initialValues: FormValues = {
  report_type: "PROJECT_REPORT",
  title: "",
  topic: "",
  description: "",
  target_pages: "55",
  citation_style: "IEEE",
};

const fieldNames = [
  "report_type",
  "title",
  "topic",
  "description",
  "target_pages",
  "citation_style",
] as const;

export function NewProjectPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Reuse this key for every attempt in the current form session.
  const idempotencyKeyRef = useRef(newIdempotencyKey());
  const [submitError, setSubmitError] = useState("");

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues,
  });

  const mutation = useMutation({
    mutationFn: (payload: FormValues) =>
      api<Project>("/projects", {
        method: "POST",
        idempotencyKey: idempotencyKeyRef.current,
        body: {
          report_type: payload.report_type,
          title: payload.title.trim(),
          topic: payload.topic.trim(),
          description: payload.description.trim() || null,
          target_pages: Number(payload.target_pages),
          citation_style: payload.citation_style,
        },
      }),

    onSuccess: async (createdProject) => {
      // Only rotate the key after the server confirms success.
      idempotencyKeyRef.current = newIdempotencyKey();

      await queryClient.invalidateQueries({
        queryKey: ["projects"],
      });

      navigate(`/projects/${createdProject.id}/setup`);
    },

    onError: (error) => {
      if (error instanceof ApiError) {
        if (error.code === "VALIDATION_ERROR") {
          let hasFieldErrors = false;

          const serverFields = error.fields as
            | Record<string, string>
            | undefined;

          for (const field of fieldNames) {
            const message = serverFields?.[field];

            if (message) {
              setError(field, {
                type: "server",
                message,
              });
              hasFieldErrors = true;
            }
          }

          // Show inline field errors without a duplicate banner.
          if (hasFieldErrors) {
            setSubmitError("");
            return;
          }
        }

        setSubmitError(error.message);
        return;
      }

      setSubmitError(
        "Could not create the project. Please try again.",
      );
    },
  });

  const onSubmit = handleSubmit((values) => {
  setSubmitError("");
  clearErrors();
  mutation.mutate(values);
});

  const busy = isSubmitting || mutation.isPending;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div>
        <Link
          to="/projects"
          className="mb-3 inline-block text-sm text-ink-2 hover:text-ink"
        >
          ← Back to projects
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight">
          New project
        </h1>

        <p className="mt-1 text-sm text-ink-2">
          Set up your report workspace. You can add sources and
          college details next.
        </p>
      </div>

      {submitError && (
        <Note tone="err">
          {submitError}

          {mutation.error instanceof ApiError &&
            mutation.error.requestId && (
              <span className="mt-1 block text-xs">
                Request ID: {mutation.error.requestId}
              </span>
            )}
        </Note>
      )}

      <form
        onSubmit={onSubmit}
        noValidate
        className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-5"
      >
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="report_type"
            className="text-sm font-medium"
          >
            Report type
          </label>

          <select
            id="report_type"
            {...register("report_type")}
            aria-invalid={Boolean(errors.report_type)}
            aria-describedby={
              errors.report_type ? "report-type-error" : undefined
            }
            className="rounded-lg border border-line bg-surface px-3 py-2.5 text-sm"
          >
            <option value="PROJECT_REPORT">Project report</option>
            <option value="SEMINAR_REPORT">Seminar report</option>
          </select>

          {errors.report_type && (
            <p id="report-type-error" className="text-xs text-err">
              {errors.report_type.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="title" className="text-sm font-medium">
            Project title <span className="text-err">*</span>
          </label>

          <input
            id="title"
            {...register("title")}
            maxLength={255}
            placeholder="e.g. Face Recognition Based Attendance System"
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "title-error" : undefined}
            className="rounded-lg border border-line bg-surface px-3 py-2.5 text-sm"
          />

          {errors.title && (
            <p id="title-error" className="text-xs text-err">
              {errors.title.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="topic" className="text-sm font-medium">
            Topic <span className="text-err">*</span>
          </label>

          <input
            id="topic"
            {...register("topic")}
            maxLength={500}
            placeholder="What is your report about?"
            aria-invalid={Boolean(errors.topic)}
            aria-describedby={errors.topic ? "topic-error" : undefined}
            className="rounded-lg border border-line bg-surface px-3 py-2.5 text-sm"
          />

          {errors.topic && (
            <p id="topic-error" className="text-xs text-err">
              {errors.topic.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="description"
            className="text-sm font-medium"
          >
            Description{" "}
            <span className="text-ink-3">(optional)</span>
          </label>

          <textarea
            id="description"
            {...register("description")}
            maxLength={5000}
            rows={4}
            placeholder="Briefly describe the project and its objectives."
            aria-invalid={Boolean(errors.description)}
            aria-describedby={
              errors.description ? "description-error" : undefined
            }
            className="resize-y rounded-lg border border-line bg-surface px-3 py-2.5 text-sm"
          />

          {errors.description && (
            <p id="description-error" className="text-xs text-err">
              {errors.description.message}
            </p>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="target_pages"
              className="text-sm font-medium"
            >
              Target pages <span className="text-err">*</span>
            </label>

            <input
              id="target_pages"
              type="number"
              min={10}
              max={300}
              step={1}
              {...register("target_pages")}
              aria-invalid={Boolean(errors.target_pages)}
              aria-describedby={
                errors.target_pages
                  ? "target-pages-error"
                  : "target-pages-help"
              }
              className="rounded-lg border border-line bg-surface px-3 py-2.5 text-sm"
            />

            {errors.target_pages && (
              <p id="target-pages-error" className="text-xs text-err">
                {errors.target_pages.message}
              </p>
            )}

            <p id="target-pages-help" className="text-xs text-ink-3">
              Choose between 10 and 300 pages.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="citation_style"
              className="text-sm font-medium"
            >
              Citation style
            </label>

            <select
              id="citation_style"
              {...register("citation_style")}
              aria-invalid={Boolean(errors.citation_style)}
              aria-describedby={
                errors.citation_style
                  ? "citation-style-error"
                  : undefined
              }
              className="rounded-lg border border-line bg-surface px-3 py-2.5 text-sm"
            >
              <option value="IEEE">IEEE</option>
              <option value="APA">APA</option>
            </select>

            {errors.citation_style && (
              <p id="citation-style-error" className="text-xs text-err">
                {errors.citation_style.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-4">
          <Link
            to="/projects"
            className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium hover:bg-surface-2"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Creating..." : "Create project"}
          </button>
        </div>
      </form>
    </div>
  );
}
