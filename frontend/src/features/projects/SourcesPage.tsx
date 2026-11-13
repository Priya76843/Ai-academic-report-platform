import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api/client";
import { queries } from "../../lib/api/queries";
import { useJob } from "../../hooks/useJob";
import type {
  AsyncEnvelope,
  Source,
} from "../../lib/api/types";

type Template = {
  template_key: string;
  name: string;
  university: string | null;
  front_matter: string[];
  chapter_count: number;
};

type UploadResponse = {
  source: Source;
  upload?: {
    url: string;
    method: "PUT";
    headers: Record<string, string>;
    expires_at: string;
  };
};

type TrackedJob = {
  sourceId: string;
  jobId: string;
};

function JobWatcher({
  jobId,
  onComplete,
}: {
  jobId: string;
  onComplete: () => void;
}) {
  const { job, done } = useJob(jobId);
  const handled = useRef(false);

  useEffect(() => {
    if (done && !handled.current) {
      handled.current = true;
      onComplete();
    }
  }, [done, onComplete]);

  if (!job) return null;

  return (
    <p className="text-xs text-slate-500">
      {job.status === "QUEUED"
        ? "Waiting to process..."
        : job.status === "RETRYING"
          ? "Retrying processing..."
          : job.status === "FAILED"
            ? job.error?.message || "Processing failed."
            : job.status === "SUCCEEDED"
              ? "Processing completed."
              : job.progress?.step || "Processing your source..."}
    </p>
  );
}

function statusLabel(status: Source["status"]) {
  const labels: Record<Source["status"], string> = {
    UPLOAD_PENDING: "Upload pending",
    UPLOADED: "Uploaded",
    PROCESSING: "Processing",
    READY: "Ready",
    FAILED: "Failed",
    RESOLVING: "Resolving link",
    NEEDS_UPLOAD: "PDF required",
  };

  return labels[status];
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function SourcesPage() {
  const { projectId = "" } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [jobIds, setJobIds] = useState<TrackedJob[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  const sourcesQuery = useQuery({
    ...queries.sources(projectId),
    enabled: Boolean(projectId),
  });

  const templatesQuery = useQuery({
    queryKey: ["templates", "library"],
    queryFn: () => api<{ items: Template[] }>("/templates/library"),
    enabled: showTemplates,
  });

  const sources = sourcesQuery.data?.items ?? [];
  const readiness = sourcesQuery.data?.readiness;

  const refreshSources = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["sources", projectId],
    });
  };

  const uploadPdf = async (file?: File) => {
    if (!file || !projectId) return;

    setMessage("");

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setMessage("Please select a PDF file.");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setMessage("The PDF must be 25 MB or smaller.");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const result = await api<UploadResponse>(
        `/projects/${projectId}/sources`,
        {
          method: "POST",
          body: {
            source_type: "PAPER",
            filename: file.name,
            mime_type: file.type || "application/pdf",
            size_bytes: file.size,
          },
        },
      );

      await refreshSources();

      if (!result.upload) {
        throw new Error("The server did not provide an upload URL.");
      }

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        xhr.open(result.upload!.method, result.upload!.url);

        Object.entries(result.upload!.headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setProgress(
              Math.round((event.loaded / event.total) * 100),
            );
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error("Upload interrupted, try again."));
          }
        };

        xhr.onerror = () => {
          reject(new Error("Upload interrupted, try again."));
        };

        xhr.onabort = () => {
          reject(new Error("Upload cancelled."));
        };

        xhr.send(file);
      });

      const job = await api<AsyncEnvelope>(
        `/projects/${projectId}/sources/${result.source.id}/complete`,
        { method: "POST" },
      );

      setJobIds((current) => [
        ...current,
        {
          sourceId: result.source.id,
          jobId: job.job_id,
        },
      ]);

      await refreshSources();

      setMessage("PDF uploaded. Processing has started.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Upload interrupted, try again.",
      );

      await refreshSources();
    } finally {
      xhrRef.current = null;
      setUploading(false);
      setProgress(0);

      if (fileInput.current) {
        fileInput.current.value = "";
      }
    }
  };

  const cancelUpload = () => {
    xhrRef.current?.abort();
  };

  const selectTemplate = async (templateKey: string) => {
    setMessage("");

    try {
      await api<Source>(`/projects/${projectId}/template/select`, {
        method: "POST",
        body: {
          template_key: templateKey,
        },
      });

      setShowTemplates(false);
      await refreshSources();

      setMessage("College format selected successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not select template.",
      );
    }
  };

  const deleteSource = async (sourceId: string) => {
    if (!window.confirm("Remove this source from the project?")) return;

    try {
      await api<void>(
        `/projects/${projectId}/sources/${sourceId}`,
        { method: "DELETE" },
      );

      setJobIds((current) =>
        current.filter((item) => item.sourceId !== sourceId),
      );

      await refreshSources();
      setMessage("Source removed.");
    } catch (error) {
      const messageText =
        error instanceof Error
          ? error.message
          : "Could not remove source.";

      setMessage(
        messageText.includes("SOURCE_IN_USE")
          ? "This source is cited by an approved report section and cannot be removed."
          : messageText,
      );
    }
  };

  const paperCount = sources.filter(
    (source) =>
      (source.source_type === "PAPER" ||
        source.source_type === "PAPER_LINK") &&
      source.status === "READY",
  ).length;

  if (!projectId) {
    return <main className="p-6">Project ID is missing.</main>;
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <header>
        <p className="text-sm font-medium text-slate-500">
          Project setup / Sources
        </p>

        <h1 className="mt-2 text-3xl font-semibold text-slate-900">
          Sources &amp; Evidence
        </h1>

        <p className="mt-2 text-slate-600">
          Upload research papers and select your college format to prepare
          your academic report.
        </p>
      </header>

      {message && (
        <div
          role="status"
          className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
        >
          {message}
        </div>
      )}

      {sourcesQuery.isLoading && (
        <p className="text-sm text-slate-500">
          Loading your sources...
        </p>
      )}

      {sourcesQuery.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Could not load sources. Please refresh the page.

          <button
            type="button"
            className="ml-3 font-semibold underline"
            onClick={() => void sourcesQuery.refetch()}
          >
            Retry
          </button>
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold">College format</h2>

          <p className="mt-2 text-sm text-slate-600">
            Select an available report template from the library.
          </p>

          <button
            type="button"
            onClick={() => setShowTemplates((value) => !value)}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            {showTemplates ? "Close library" : "Choose template"}
          </button>

          {showTemplates && (
            <div className="mt-4 space-y-3">
              {templatesQuery.isLoading && (
                <p className="text-sm text-slate-500">
                  Loading templates...
                </p>
              )}

              {templatesQuery.isError && (
                <p className="text-sm text-red-600">
                  Could not load templates. Try again.
                </p>
              )}

              {templatesQuery.data?.items.map((template) => (
                <div
                  key={template.template_key}
                  className="rounded-lg border border-slate-200 p-3"
                >
                  <p className="font-medium">{template.name}</p>

                  <p className="text-xs text-slate-500">
                    {template.university ?? "General"} -{" "}
                    {template.chapter_count} chapters
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      void selectTemplate(template.template_key)
                    }
                    className="mt-2 text-sm font-medium text-blue-700"
                  >
                    Select template
                  </button>
                </div>
              ))}

              {templatesQuery.data?.items.length === 0 && (
                <p className="text-sm text-slate-500">
                  No templates are currently available.
                </p>
              )}
            </div>
          )}

          <p className="mt-3 text-xs text-slate-500">
            Without a selected format, the system uses its built-in report
            structure.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Research papers</h2>

          <p className="mt-2 text-sm text-slate-600">
            Upload PDF papers as supporting evidence. Maximum file size: 25 MB.
          </p>

          <input
            ref={fileInput}
            type="file"
            accept=".pdf,application/pdf"
            disabled={uploading}
            className="mt-4 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-medium"
            onChange={(event) =>
              void uploadPdf(event.target.files?.[0])
            }
          />

          {uploading && (
            <div className="mt-4 space-y-2">
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Uploading: {progress}%</span>

                <button
                  type="button"
                  onClick={cancelUpload}
                  className="font-semibold text-red-600"
                >
                  Cancel upload
                </button>
              </div>
            </div>
          )}

          <p className="mt-3 text-xs text-slate-500">
            Paste-a-link support is planned for Slice 2.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Source code</h2>

          <p className="mt-2 text-sm text-slate-600">
            Add project code for static inspection. Code is never executed.
          </p>

          <span className="mt-4 inline-block text-sm font-medium text-amber-700">
            Coming soon · Slice 2
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Screenshots</h2>

          <p className="mt-2 text-sm text-slate-600">
            Add application screenshots as supporting evidence.
          </p>

          <span className="mt-4 inline-block text-sm font-medium text-amber-700">
            Coming soon · Slice 2
          </span>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">
            Uploaded sources
          </h2>

          <span className="text-sm text-slate-500">
            {sources.length} source{sources.length === 1 ? "" : "s"}
          </span>
        </div>

        {sources.length === 0 && !sourcesQuery.isLoading && (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
            <p className="font-medium text-slate-700">
              No sources added yet
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Upload a research paper or select a college format to get
              started.
            </p>
          </div>
        )}

        {sources.map((source) => (
          <article
            key={source.id}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-all font-medium text-slate-900">
                  {source.filename || source.label || source.source_type}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {source.source_type} · {formatBytes(source.size_bytes)}
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {statusLabel(source.status)}
              </span>
            </div>

            {source.status === "PROCESSING" && (
              <div className="mt-2 space-y-1">
                <p className="text-sm text-slate-600">
                  Processing source...
                </p>

                {jobIds
                  .filter((item) => item.sourceId === source.id)
                  .map((item) => (
                    <JobWatcher
                      key={item.jobId}
                      jobId={item.jobId}
                      onComplete={() => void refreshSources()}
                    />
                  ))}
              </div>
            )}

            {source.status === "UPLOADED" && (
              <p className="mt-2 text-sm text-amber-700">
                Your file has been uploaded and is waiting for processing
                to begin.
              </p>
            )}

            {source.status === "READY" && (
              <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                {source.source_type === "PAPER" &&
                typeof source.summary === "object" &&
                source.summary !== null ? (
                  <>
                    <p className="font-medium">
                      {String(
                        (source.summary as { title?: unknown }).title ??
                          "Paper processed",
                      )}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Pages:{" "}
                      {String(
                        (source.summary as { page_count?: unknown })
                          .page_count ?? "—",
                      )}
                      {" · "}
                      Passages:{" "}
                      {String(
                        (source.summary as { passage_count?: unknown })
                          .passage_count ?? "—",
                      )}
                    </p>
                  </>
                ) : (
                  <p>Source processed successfully.</p>
                )}
              </div>
            )}

            {source.status === "FAILED" && (
              <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <p className="font-medium">
                  {source.error?.category || "Processing failed"}
                </p>

                <p className="mt-1">
                  {source.error?.message || "Processing could not be completed."}
                </p>

                <p className="mt-1 text-xs">
                  Remove this source, then upload the PDF again. Automatic
                  retry is not available in Slice 1.
                </p>
              </div>
            )}

            {source.status === "UPLOAD_PENDING" && (
              <p className="mt-2 text-sm text-amber-700">
                Upload was not completed. Remove this entry if necessary and
                upload the PDF again.
              </p>
            )}

            {source.status === "RESOLVING" && (
              <p className="mt-2 text-sm text-blue-700">
                The source link is being checked. Link processing is
                available in Slice 2.
              </p>
            )}

            {source.status === "NEEDS_UPLOAD" && (
              <p className="mt-2 text-sm text-amber-700">
                A PDF file is required for this source. Attaching a PDF to
                an existing link will be available in Slice 2.
              </p>
            )}

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => void deleteSource(source.id)}
                className="text-sm font-medium text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          </article>
        ))}
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
        <div className="text-sm text-slate-600">
          {readiness?.format_ready
            ? "College format is ready."
            : "No college format selected; the built-in format will be used."}

          <p className="text-xs text-slate-500">
            {readiness?.paper_ready_count ?? paperCount} usable research
            paper(s) ready.
          </p>
        </div>

        <button
          type="button"
          disabled={!readiness?.can_continue_to_plan}
          onClick={() => {
            window.location.href = `/projects/${projectId}/plan`;
          }}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue to plan
        </button>
      </footer>
    </main>
  );
}
