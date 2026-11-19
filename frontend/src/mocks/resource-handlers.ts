import { http, HttpResponse } from "msw";
import type { ErrorEnvelope, Project, SourceType } from "@/lib/api/types";
import { project as fixture } from "./fixtures";
type JsonObject = Record<string, unknown>;
type ResourceRecord = Record<string, unknown>;
type MockJob = {
  id: string;
  project_id: string | null;
  job_type: string;
  status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";
  progress: Record<string, unknown>;
  resource_type: string | null;
  resource_id: string | null;
  attempt: number;
  error: null | Record<string, unknown>;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  polls: number;
  should_fail?: boolean;
  export_id?: string;
};
const error = (
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string>,
) =>
  HttpResponse.json<ErrorEnvelope>(
    {
      error: {
        code,
        message,
        details: fields ? { fields } : {},
      },
      request_id: crypto.randomUUID(),
    },
    { status },
  );
const timestamp = () => new Date().toISOString();
const cloneProject = (value: Project): Project => structuredClone(value);
const projects = new Map<string, Project>([
  [fixture.id, cloneProject(fixture)],
]);
const idempotency = new Map<string, Project>();
let idempotencyKeys: string[] = [];
let failNextCreate = false;
let nextValidationErrors: Record<string, string> | null = null;
let failNextSourceJob = false;
type AssetMock = {
  id: string;
  project_id: string;
  asset_type: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  status: string;
  created_at: string;
};
type SourceMock = {
  id: string;
  project_id: string;
  source_type: SourceType;
  filename: string | null;
  url: string | null;
  label: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  status: string;
  error: { category: string; message: string } | null;
  summary: unknown | null;
  citation_key: string | null;
  created_at: string;
};
const assets = new Map<string, AssetMock>();
const uploadedAssets = new Set<string>();
const sources = new Map<string, SourceMock>();
const plans = new Map<string, ResourceRecord>();
const sections = new Map<string, ResourceRecord>();
const figures = new Map<string, ResourceRecord>();
const findings = new Map<string, ResourceRecord>();
const exportsById = new Map<string, ResourceRecord>();
const jobs = new Map<string, MockJob>();
const templates = [
  {
    template_key: "generic_engineering_project_report_v1",
    name: "Generic Engineering Project Report",
    university: null,
    front_matter: [],
    chapter_count: 9,
  },
];
const upload = (resourceId: string) => ({
  url: `https://mock-upload.local/${resourceId}`,
  method: "PUT" as const,
  headers: {},
  expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
});
const getProject = (projectId: string) => projects.get(projectId);
const projectSources = (projectId: string) =>
  [...sources.values()].filter((source) => source.project_id === projectId);
const projectSections = (projectId: string) =>
  [...sections.values()].filter((section) => section.project_id === projectId);
const createJob = (input: {
  job_type: string;
  project_id: string | null;
  resource_type: string | null;
  resource_id: string | null;
  export_id?: string;
}): MockJob => {
  const shouldFail =
    input.resource_type === "source" && failNextSourceJob;

  if (shouldFail) {
    failNextSourceJob = false;
  }

  const job: MockJob = {
    id: crypto.randomUUID(),
    project_id: input.project_id,
    job_type: input.job_type,
    status: "QUEUED",
    progress: { step: "Queued", completed: 0, total: 2 },
    resource_type: input.resource_type,
    resource_id: input.resource_id,
    attempt: 1,
    error: null,
    created_at: timestamp(),
    started_at: null,
    completed_at: null,
    polls: 0,
    ...(shouldFail ? { should_fail: true } : {}),
    ...(input.export_id ? { export_id: input.export_id } : {}),
  };
  jobs.set(job.id, job);
  return job;
};
// Keep internal polling fields out of the public job response.
const publicJob = (job: MockJob) => {
  const result: Record<string, unknown> = { ...job };
  delete result.polls;
  delete result.should_fail;
  delete result.export_id;
  return result;
};
const pollJob = (id: string): Record<string, unknown> | undefined => {
  const current = jobs.get(id);
  if (!current) {
    return undefined;
  }
  if (current.status === "SUCCEEDED" || current.status === "FAILED") {
    return publicJob(current);
  }
  const polls = current.polls + 1;
  const now = timestamp();
  const shouldFail = current.should_fail === true && polls >= 3;
  const status: MockJob["status"] =
    polls === 1
      ? "QUEUED"
      : polls === 2
        ? "RUNNING"
        : shouldFail
          ? "FAILED"
          : "SUCCEEDED";
  const updated: MockJob = {
    ...current,
    polls,
    status,
    started_at:
      status === "RUNNING" || status === "SUCCEEDED"
        ? current.started_at ?? now
        : current.started_at,
    completed_at: status === "SUCCEEDED" ? now : null,
    progress:
      status === "QUEUED"
        ? { step: "Queued", completed: 0, total: 2 }
        : status === "RUNNING"
          ? { step: "Processing", completed: 1, total: 2 }
          : { step: "Completed", completed: 2, total: 2 },
  };
  jobs.set(id, updated);

    if (
    updated.status === "SUCCEEDED" &&
    updated.resource_type === "source" &&
    typeof updated.resource_id === "string"
  ) {
    const source = sources.get(updated.resource_id);

    if (source) {
      sources.set(source.id, {
        ...source,
        status: "READY",
        ...(source.source_type === "PAPER"
          ? {
              summary: {
                title: source.filename ?? "Sample research paper",
                authors: ["A. Researcher"],
                year: 2024,
                page_count: 8,
                passage_count: 24,
                extraction_quality: "high",
              },
            }
          : {}),
      });
    }
  }
  if (updated.export_id) {
    const exportRecord = exportsById.get(updated.export_id);
    if (exportRecord) {
      exportsById.set(updated.export_id, {
        ...exportRecord,
        status:
          status === "QUEUED"
            ? "QUEUED"
            : status === "RUNNING"
              ? "RUNNING"
              : "READY",
        completed_at: status === "SUCCEEDED" ? now : null,
        page_count: status === "SUCCEEDED" ? 9 : null,
        file_size: status === "SUCCEEDED" ? 128_000 : null,
      });
    }
  }
  return publicJob(updated);
};
const asyncJobResponse = (job: MockJob) => ({
  job_id: job.id,
  job_type: job.job_type,
  status: job.status,
  resource_type: job.resource_type,
  resource_id: job.resource_id,
  status_url: `/api/v1/jobs/${job.id}`,
});
export const resourceMockState = {
  getProject(projectId: string) {
    return getProject(projectId);
  },
  listProjects(page: number, pageSize: number) {
    const allProjects = [...projects.values()];
    const start = (page - 1) * pageSize;
    return {
      items: allProjects.slice(start, start + pageSize),
      page,
      page_size: pageSize,
      total: allProjects.length,
    };
  },
  pollJob,
  listProjectJobs(projectId: string, activeOnly = false) {
    return [...jobs.values()]
      .filter((job) => job.project_id === projectId)
      .filter(
        (job) =>
          !activeOnly ||
          (job.status !== "SUCCEEDED" && job.status !== "FAILED"),
      )
      .map((job) => publicJob(job));
  },
  getSources(projectId: string) {
    return projectSources(projectId).map((source) =>
      structuredClone(source),
    );
  },
  setSources(nextSources: SourceMock[]) {
    sources.clear();
    uploadedAssets.clear();

    for (const source of nextSources) {
      sources.set(source.id, structuredClone(source));
    }
  },
  resetProjects() {
    projects.clear();
    projects.set(fixture.id, cloneProject(fixture));
    idempotency.clear();
    idempotencyKeys = [];
    failNextCreate = false;
    nextValidationErrors = null;
  },
  setProjects(nextProjects: Project[]) {
    projects.clear();
    for (const item of nextProjects) {
      projects.set(item.id, cloneProject(item));
    }
  },
  failNextCreateOnce() {
    failNextCreate = true;
  },
  setNextCreateValidationError(fields: Record<string, string>) {
    nextValidationErrors = { ...fields };
  },
  getIdempotencyKeys() {
    return [...idempotencyKeys];
  },
  resetJobs() {
    jobs.clear();
  },
  reset() {
    projects.clear();
    projects.set(fixture.id, cloneProject(fixture));
    idempotency.clear();
    assets.clear();
    uploadedAssets.clear();
    sources.clear();
    plans.clear();
    sections.clear();
    figures.clear();
    findings.clear();
    exportsById.clear();
    jobs.clear();
    idempotencyKeys = [];
    failNextCreate = false;
    nextValidationErrors = null;
  },
};
export const resourceHandlers = [
  // List project jobs (used to restore active jobs after refresh)
  http.get("/api/v1/projects/:id/jobs", ({ params, request }) => {
    const activeOnly =
      new URL(request.url).searchParams.get("active") === "true";

    return HttpResponse.json(
      resourceMockState.listProjectJobs(String(params.id), activeOnly),
    );
  }),

  // Create project
  http.post("/api/v1/projects", async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as JsonObject;
    const key = request.headers.get("Idempotency-Key");
    if (key) {
      idempotencyKeys.push(key);
    }
    if (failNextCreate) {
      failNextCreate = false;
      return HttpResponse.error();
    }
    if (key && idempotency.has(key)) {
      return HttpResponse.json(idempotency.get(key), { status: 201 });
    }
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    const fields: Record<string, string> = {};
    if (
      body.report_type !== "PROJECT_REPORT" &&
      body.report_type !== "SEMINAR_REPORT"
    ) {
      fields.report_type = "Choose a valid report type.";
    }
    if (title.length < 5 || title.length > 255) {
      fields.title = "Title must be between 5 and 255 characters.";
    }
    if (!topic || topic.length > 500) {
      fields.topic = "Topic must be between 1 and 500 characters.";
    }
    if (
      typeof body.description === "string" &&
      body.description.length > 5000
    ) {
      fields.description = "Description must not exceed 5000 characters.";
    }
    if (
      body.target_pages !== undefined &&
      (!Number.isInteger(body.target_pages) ||
        Number(body.target_pages) < 10 ||
        Number(body.target_pages) > 300)
    ) {
      fields.target_pages = "Target pages must be between 10 and 300.";
    }
    if (
      body.citation_style !== undefined &&
      body.citation_style !== "IEEE" &&
      body.citation_style !== "APA"
    ) {
      fields.citation_style = "Choose IEEE or APA.";
    }
    if (nextValidationErrors) {
      Object.assign(fields, nextValidationErrors);
      nextValidationErrors = null;
    }
    if (Object.keys(fields).length) {
      return error(
        422,
        "VALIDATION_ERROR",
        "Check the highlighted fields.",
        fields,
      );
    }
    const now = timestamp();
    const created: Project = {
      ...cloneProject(fixture),
      id: crypto.randomUUID(),
      report_type: body.report_type as Project["report_type"],
      title,
      topic,
      description:
        typeof body.description === "string"
          ? body.description.trim() || null
          : null,
      target_pages:
        typeof body.target_pages === "number" ? body.target_pages : 55,
      citation_style: body.citation_style === "APA" ? "APA" : "IEEE",
      status: "DRAFT",
      template_name: null,
      source_counts: {
        PAPER: 0,
        PAPER_LINK: 0,
        COLLEGE_FORMAT: 0,
        SOURCE_CODE: 0,
        SCREENSHOT: 0,
        total: 0,
      },
      sections_approved: 0,
      sections_total: 0,
      details: {},
      logo_asset_id: null,
      created_at: now,
      updated_at: now,
    };
    projects.set(created.id, created);
    if (key) {
      idempotency.set(key, created);
    }
    return HttpResponse.json(created, { status: 201 });
  }),
  // Update project
  http.patch("/api/v1/projects/:id", async ({ params, request }) => {
    const projectId = String(params.id);
    const current = getProject(projectId);
    if (!current) {
      return error(404, "NOT_FOUND", "Project not found.");
    }
    const body = (await request.json().catch(() => ({}))) as JsonObject;
    const fields: Record<string, string> = {};
    if (
      body.title !== undefined &&
      (typeof body.title !== "string" ||
        body.title.trim().length < 5 ||
        body.title.trim().length > 255)
    ) {
      fields.title = "Title must be between 5 and 255 characters.";
    }
    if (
      body.topic !== undefined &&
      (typeof body.topic !== "string" ||
        !body.topic.trim() ||
        body.topic.trim().length > 500)
    ) {
      fields.topic = "Topic must be between 1 and 500 characters.";
    }
    if (
      typeof body.description === "string" &&
      body.description.length > 5000
    ) {
      fields.description = "Description must not exceed 5000 characters.";
    }
    if (
      body.target_pages !== undefined &&
      body.target_pages !== null &&
      (!Number.isInteger(body.target_pages) ||
        Number(body.target_pages) < 10 ||
        Number(body.target_pages) > 300)
    ) {
      fields.target_pages = "Target pages must be between 10 and 300.";
    }
    if (
      body.citation_style !== undefined &&
      body.citation_style !== "IEEE" &&
      body.citation_style !== "APA"
    ) {
      fields.citation_style = "Choose IEEE or APA.";
    }
    if (Object.keys(fields).length) {
      return error(
        422,
        "VALIDATION_ERROR",
        "Check the highlighted fields.",
        fields,
      );
    }
    const updated: Project = {
      ...current,
      ...(typeof body.title === "string" ? { title: body.title.trim() } : {}),
      ...(typeof body.topic === "string" ? { topic: body.topic.trim() } : {}),
      ...(body.description === null || typeof body.description === "string"
        ? { description: body.description }
        : {}),
      ...(body.target_pages === null || typeof body.target_pages === "number"
        ? { target_pages: body.target_pages }
        : {}),
      ...(body.citation_style === "IEEE" || body.citation_style === "APA"
        ? { citation_style: body.citation_style }
        : {}),
      ...(body.details &&
      typeof body.details === "object" &&
      !Array.isArray(body.details)
        ? { details: body.details as Project["details"] }
        : {}),
      updated_at: timestamp(),
    };
    projects.set(projectId, updated);
    return HttpResponse.json(updated);
  }),
  // Soft-delete project: retain it for existing resource relationships.
  http.delete("/api/v1/projects/:id", ({ params }) => {
    const projectId = String(params.id);
    const current = projects.get(projectId);
    if (!current) {
      return error(404, "NOT_FOUND", "Project not found.");
    }
    // Preserve the contract-supported status.
    const updated: Project = {
      ...current,
      updated_at: timestamp(),
    };
    projects.set(projectId, updated);
    return new HttpResponse(null, { status: 204 });
  }),
  // Assets
  http.post("/api/v1/projects/:id/assets", async ({ params, request }) => {
    const projectId = String(params.id);
    if (!projects.has(projectId)) {
      return error(404, "NOT_FOUND", "Project not found.");
    }
    const body = (await request.json().catch(() => ({}))) as JsonObject;
    const fields: Record<string, string> = {};
    if (typeof body.asset_type !== "string" || !body.asset_type) {
      fields.asset_type = "Asset type is required.";
    }
    if (typeof body.filename !== "string" || !body.filename) {
      fields.filename = "Filename is required.";
    }
    if (typeof body.mime_type !== "string" || !body.mime_type) {
      fields.mime_type = "MIME type is required.";
    }
    if (typeof body.size_bytes !== "number" || body.size_bytes <= 0) {
      fields.size_bytes = "File size must be positive.";
    }
    if (Object.keys(fields).length) {
      return error(422, "VALIDATION_ERROR", "Invalid asset details.", fields);
    }
    const assetId = crypto.randomUUID();
    const asset: AssetMock = {
      id: assetId,
      project_id: projectId,
      asset_type: String(body.asset_type),
      filename: String(body.filename),
      mime_type: String(body.mime_type),
      size_bytes: Number(body.size_bytes),
      width: null,
      height: null,
      status: "UPLOADED",
      created_at: timestamp(),
    };
    assets.set(assetId, asset);
    return HttpResponse.json(
      { asset, upload: upload(assetId) },
      { status: 201 },
    );
  }),
  // Mock presigned upload for assets and sources.
  http.put(
    "https://mock-upload.local/:aid",
    async ({ params, request }) => {
      const resourceId = String(params.aid);
      const asset = assets.get(resourceId);
      const source = sources.get(resourceId);

      if (!asset && !source) {
        return error(404, "OBJECT_NOT_FOUND", "Uploaded resource not found.");
      }

      const body = await request.arrayBuffer();

      if (body.byteLength === 0) {
        return error(422, "VALIDATION_ERROR", "Uploaded file is empty.");
      }

      const expectedSize = asset?.size_bytes ?? source?.size_bytes;

      if (
        expectedSize !== null &&
        expectedSize !== undefined &&
        body.byteLength !== expectedSize
      ) {
        return error(422, "SIZE_MISMATCH", "Uploaded file size does not match.");
      }

      uploadedAssets.add(resourceId);
      return new HttpResponse(null, { status: 200 });
    },
  ),
  http.post(
    "/api/v1/projects/:id/assets/:aid/complete",
    ({ params }) => {
      const projectId = String(params.id);
      const assetId = String(params.aid);
      const asset = assets.get(assetId);
      if (!asset || asset.project_id !== projectId) {
        return error(409, "OBJECT_NOT_FOUND", "Uploaded asset was not found.");
      }
      if (!uploadedAssets.has(assetId)) {
        return error(409, "OBJECT_NOT_FOUND", "Asset upload has not completed.");
      }
      const completed = { ...asset, status: "READY" };
      assets.set(completed.id, completed);
      return HttpResponse.json(completed);
    },
  ),
  http.get("/api/v1/assets/:aid/url", ({ params }) => {
    const asset = assets.get(String(params.aid));
    if (!asset || asset.status !== "READY") {
      return error(404, "NOT_FOUND", "Ready asset not found.");
    }
    return HttpResponse.json({
      url: `https://mock-download.local/${asset.id}`,
      expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
    });
  }),
  // Sources
  http.get("/api/v1/projects/:id/sources", ({ params }) => {
    const projectId = String(params.id);

    if (!projects.has(projectId)) {
      return error(404, "NOT_FOUND", "Project not found.");
    }

    const items = projectSources(projectId);

    return HttpResponse.json({
      items,
      readiness: {
        format_ready: items.some(
          (source) =>
            source.source_type === "COLLEGE_FORMAT" &&
            source.status === "READY",
        ),
        paper_ready_count: items.filter(
          (source) =>
            ["PAPER", "PAPER_LINK"].includes(source.source_type) &&
            source.status === "READY",
        ).length,
        can_continue_to_plan: items.some(
          (source) =>
            source.source_type === "COLLEGE_FORMAT" &&
            source.status === "READY",
        ),
      },
    });
  }),

  http.post("/api/v1/projects/:id/sources", async ({ params, request }) => {
    const projectId = String(params.id);

    if (!projects.has(projectId)) {
      return error(404, "NOT_FOUND", "Project not found.");
    }

    const body = (await request.json().catch(() => ({}))) as JsonObject;

    // Slice 1 supports research-paper uploads.
    // College formats are selected through the template library.
    // Other source types are not enabled in this slice.
    const allowed: SourceType[] = ["PAPER", "PAPER_LINK"];

    const sourceType = body.source_type as SourceType;

    if (!allowed.includes(sourceType)) {
      return error(422, "UNSUPPORTED_TYPE", "Invalid source type.", {
        source_type: "Choose a valid source type.",
      });
    }

    if (
      sourceType === "PAPER_LINK" &&
      (typeof body.url !== "string" || !/^https?:\/\//i.test(body.url))
    ) {
      return error(422, "VALIDATION_ERROR", "Invalid source URL.", {
        url: "Enter a valid HTTP or HTTPS URL.",
      });
    }

    if (
      sourceType === "PAPER" &&
      typeof body.size_bytes === "number" &&
      body.size_bytes > 25 * 1024 * 1024
    ) {
      return error(422, "SOURCE_TOO_LARGE", "PDF exceeds the 25 MB limit.");
    }

    const sourceId = crypto.randomUUID();
    const linked = sourceType === "PAPER_LINK";

    const source: SourceMock = {
      id: sourceId,
      project_id: projectId,
      source_type: sourceType,
      filename: typeof body.filename === "string" ? body.filename : null,
      url: typeof body.url === "string" ? body.url : null,
      label: typeof body.label === "string" ? body.label : null,
      mime_type: typeof body.mime_type === "string" ? body.mime_type : null,
      size_bytes: typeof body.size_bytes === "number" ? body.size_bytes : null,
      status: linked ? "RESOLVING" : "UPLOADED",
      error: null,
      summary: null,
      citation_key: `S${sources.size + 1}`,
      created_at: timestamp(),
    };

    sources.set(sourceId, source);

    return HttpResponse.json(
      linked ? { source } : { source, upload: upload(sourceId) },
      { status: 201 },
    );
  }),

  http.post(
    "/api/v1/projects/:id/sources/:sid/complete",
    ({ params }) => {
      const source = sources.get(String(params.sid));

      if (!source || source.project_id !== String(params.id)) {
        return error(409, "OBJECT_NOT_FOUND", "Source was not found.");
      }

      if (!uploadedAssets.has(source.id)) {
        return error(
          409,
          "OBJECT_NOT_FOUND",
          "Source upload has not completed.",
        );
      }

      const updated = { ...source, status: "PROCESSING" };
      sources.set(updated.id, updated);

      const jobType =
        source.source_type === "PAPER" ||
        source.source_type === "PAPER_LINK"
          ? "ingest_pdf"
          : source.source_type === "COLLEGE_FORMAT"
            ? "parse_template"
            : source.source_type === "SOURCE_CODE"
              ? "analyze_code"
              : "analyze_screenshot";

      const job = createJob({
        job_type: jobType,
        project_id: source.project_id,
        resource_type: "source",
        resource_id: source.id,
      });

      return HttpResponse.json(asyncJobResponse(job), { status: 202 });
    },
  ),

  http.post(
    "/api/v1/projects/:id/sources/:sid/attach-pdf",
    async ({ params, request }) => {
      const source = sources.get(String(params.sid));

      if (
        !source ||
        source.project_id !== String(params.id) ||
        source.source_type !== "PAPER_LINK"
      ) {
        return error(
          409,
          "OBJECT_NOT_FOUND",
          "A matching linked source was not found.",
        );
      }

      const body = (await request.json().catch(() => ({}))) as JsonObject;
      const sourceId = crypto.randomUUID();

      const attached: SourceMock = {
        ...source,
        id: sourceId,
        filename:
          typeof body.filename === "string"
            ? body.filename
            : "attached-paper.pdf",
        mime_type: "application/pdf",
        size_bytes:
          typeof body.size_bytes === "number" ? body.size_bytes : null,
        status: "UPLOADED",
        created_at: timestamp(),
      };

      sources.set(sourceId, attached);

      return HttpResponse.json(
        { source: attached, upload: upload(sourceId) },
        { status: 201 },
      );
    },
  ),

  http.get("/api/v1/projects/:id/sources/:sid", ({ params }) => {
    const source = sources.get(String(params.sid));

    if (!source || source.project_id !== String(params.id)) {
      return error(404, "NOT_FOUND", "Source not found.");
    }

    return HttpResponse.json(source);
  }),

  http.delete("/api/v1/projects/:id/sources/:sid", ({ params }) => {
    const source = sources.get(String(params.sid));

    if (!source || source.project_id !== String(params.id)) {
      return error(404, "NOT_FOUND", "Source not found.");
    }

    const isUsedByApprovedVersion = projectSections(
      source.project_id,
    ).some(
      (section) =>
        section.status === "APPROVED" &&
        section.approved_version_id !== null &&
        typeof section.content === "string" &&
        typeof source.citation_key === "string" &&
        source.citation_key.length > 0 &&
        section.content.includes(source.citation_key),
    );

    if (isUsedByApprovedVersion) {
      return error(
        409,
        "SOURCE_IN_USE",
        "This source is cited by an approved section and cannot be deleted.",
      );
    }

    sources.delete(source.id);
    uploadedAssets.delete(source.id);

    return new HttpResponse(null, { status: 204 });
  }),

  // Template library
  http.get("/api/v1/templates/library", () =>
    HttpResponse.json({ items: templates }),
  ),

  http.post(
    "/api/v1/projects/:id/template/select",
    async ({ params, request }) => {
      const projectId = String(params.id);

      if (!projects.has(projectId)) {
        return error(404, "NOT_FOUND", "Project not found.");
      }

      const body = (await request.json().catch(() => ({}))) as {
        template_key?: string;
      };

      const template = templates.find(
        (item) => item.template_key === body.template_key,
      );

      if (!template) {
        return error(422, "VALIDATION_ERROR", "Unknown template.");
      }

      if (
        projectSources(projectId).some(
          (source) =>
            source.source_type === "COLLEGE_FORMAT" &&
            source.status === "READY",
        )
      ) {
        return error(
          409,
          "FORMAT_ALREADY_SELECTED",
          "A ready format already exists.",
        );
      }

      const source: SourceMock = {
        id: crypto.randomUUID(),
        project_id: projectId,
        source_type: "COLLEGE_FORMAT",
        filename: null,
        url: null,
        label: template.name,
        mime_type: null,
        size_bytes: null,
        status: "READY",
        error: null,
        summary: {
          front_matter: template.front_matter,
          chapter_count: template.chapter_count,
          style: {
            font: "Times New Roman",
            size: 12,
            spacing: 1.5,
            margins: "1 inch",
            citation_style: projects.get(projectId)?.citation_style ?? "IEEE",
          },
        },
        citation_key: null,
        created_at: timestamp(),
      };

      sources.set(source.id, source);

      return HttpResponse.json(source, { status: 201 });
    },
  ),
  // Plans
  http.post("/api/v1/projects/:id/plan", async ({ params, request }) => {
    const projectId = String(params.id);
    if (!projects.has(projectId)) {
      return error(404, "NOT_FOUND", "Project not found.");
    }
    if (plans.has(projectId)) {
      return error(409, "PLAN_LOCKED", "A plan already exists.");
    }
    const body = (await request.json().catch(() => ({}))) as {
      template_key?: string;
    };
    const template =
      templates.find((item) => item.template_key === body.template_key) ??
      templates[0];
    const plan: ResourceRecord = {
      id: crypto.randomUUID(),
      project_id: projectId,
      template_key: template.template_key,
      template_name: template.name,
      front_matter: template.front_matter,
      style_summary: {
        font: "Times New Roman",
        font_size: 12,
        line_spacing: 1.5,
        margins: "1 inch",
        citation_style: projects.get(projectId)?.citation_style ?? "IEEE",
      },
      sections: [],
    };
    plans.set(projectId, plan);
    return HttpResponse.json(plan, { status: 201 });
  }),
  http.get("/api/v1/projects/:id/plan", ({ params }) => {
    const plan = plans.get(String(params.id));
    return plan
      ? HttpResponse.json(plan)
      : error(404, "PLAN_NOT_FOUND", "Plan not found.");
  }),
  http.patch("/api/v1/projects/:id/plan", async ({ params, request }) => {
    const projectId = String(params.id);
    const plan = plans.get(projectId);
    if (!plan) {
      return error(404, "PLAN_NOT_FOUND", "Plan not found.");
    }
    const current = Array.isArray(plan.sections)
      ? (plan.sections as ResourceRecord[])
      : [];
    if (current.some((section) => section.status !== "PLANNED")) {
      return error(409, "PLAN_LOCKED", "The plan can no longer be changed.");
    }
    const body = (await request.json().catch(() => ({}))) as {
      sections?: ResourceRecord[];
    };
    const next = (body.sections ?? [])
      .filter((item) => item.removed !== true)
      .map((item, index) => {
        const sectionId =
          typeof item.id === "string" ? item.id : crypto.randomUUID();
        const section: ResourceRecord = {
          id: sectionId,
          project_id: projectId,
          title:
            typeof item.title === "string"
              ? item.title
              : `Section ${index + 1}`,
          section_type: "CHAPTER",
          order_index:
            typeof item.order_index === "number"
              ? item.order_index
              : index + 1,
          status: "PLANNED",
          target_words:
            typeof item.target_words === "number" ? item.target_words : 1000,
          evidence_policy: "REQUIRED",
          active_version_id: null,
          approved_version_id: null,
          content: "",
        };
        sections.set(sectionId, section);
        return section;
      });
    const updated = { ...plan, sections: next };
    plans.set(projectId, updated);
    return HttpResponse.json(updated);
  }),
  // Sections
  http.get("/api/v1/projects/:id/sections", ({ params }) => {
    const projectId = String(params.id);
    if (!projects.has(projectId)) {
      return error(404, "NOT_FOUND", "Project not found.");
    }
    return HttpResponse.json({ items: projectSections(projectId) });
  }),
  http.get("/api/v1/sections/:sid", ({ params }) => {
    const section = sections.get(String(params.sid));
    return section
      ? HttpResponse.json(section)
      : error(404, "NOT_FOUND", "Section not found.");
  }),
  http.post("/api/v1/sections/:sid/generate", ({ params }) => {
    const section = sections.get(String(params.sid));
    if (!section) {
      return error(404, "NOT_FOUND", "Section not found.");
    }
    const job = createJob({
      job_type: "generate_section",
      project_id: String(section.project_id),
      resource_type: "section",
      resource_id: String(params.sid),
    });
    return HttpResponse.json(asyncJobResponse(job), { status: 202 });
  }),
  http.post("/api/v1/sections/:sid/regenerate", ({ params }) => {
    const section = sections.get(String(params.sid));
    if (!section) {
      return error(404, "NOT_FOUND", "Section not found.");
    }
    const job = createJob({
      job_type: "regenerate_section",
      project_id: String(section.project_id),
      resource_type: "section",
      resource_id: String(params.sid),
    });
    return HttpResponse.json(asyncJobResponse(job), { status: 202 });
  }),
  http.put("/api/v1/sections/:sid/content", async ({ params, request }) => {
    const sectionId = String(params.sid);
    const section = sections.get(sectionId);
    if (!section) {
      return error(404, "NOT_FOUND", "Section not found.");
    }
    const body = (await request.json().catch(() => ({}))) as {
      content?: string;
    };
    if (typeof body.content !== "string") {
      return error(422, "VALIDATION_ERROR", "Section content must be text.");
    }
    const updated = {
      ...section,
      content: body.content,
      status: "IN_REVIEW",
      active_version_id: crypto.randomUUID(),
    };
    sections.set(sectionId, updated);
    return HttpResponse.json(updated);
  }),
  http.post("/api/v1/sections/:sid/approve", async ({ params, request }) => {
    const sectionId = String(params.sid);
    const section = sections.get(sectionId);
    if (!section) {
      return error(404, "NOT_FOUND", "Section not found.");
    }
    const body = (await request.json().catch(() => ({}))) as {
      version_id?: string;
    };
    if (!body.version_id || body.version_id !== section.active_version_id) {
      return error(
        409,
        "VERSION_NOT_ACTIVE",
        "The requested version is not active.",
      );
    }
    const updated = {
      ...section,
      status: "APPROVED",
      approved_version_id: body.version_id,
    };
    sections.set(sectionId, updated);
    return HttpResponse.json(updated);
  }),
  // Figures
  http.get("/api/v1/projects/:id/figures", ({ params }) => {
    const projectId = String(params.id);
    if (!projects.has(projectId)) {
      return error(404, "NOT_FOUND", "Project not found.");
    }
    return HttpResponse.json({
      items: [...figures.values()].filter(
        (figure) => figure.project_id === projectId,
      ),
    });
  }),
  // Final review
  http.post("/api/v1/projects/:id/final-review", ({ params }) => {
    const projectId = String(params.id);
    if (!projects.has(projectId)) {
      return error(404, "NOT_FOUND", "Project not found.");
    }
    if (
      !projectSections(projectId).some(
        (section) => section.status === "APPROVED",
      )
    ) {
      return error(
        409,
        "SECTIONS_NOT_APPROVED",
        "Approve sections before final review.",
      );
    }
    const job = createJob({
      job_type: "final_review",
      project_id: projectId,
      resource_type: "project",
      resource_id: projectId,
    });
    return HttpResponse.json(asyncJobResponse(job), { status: 202 });
  }),
  http.get("/api/v1/projects/:id/final-review", ({ params }) => {
    const projectId = String(params.id);
    if (!projects.has(projectId)) {
      return error(404, "NOT_FOUND", "Project not found.");
    }
    const items = [...findings.values()].filter(
      (finding) => finding.project_id === projectId,
    );
    return HttpResponse.json({
      status: "COMPLETED",
      findings: items,
      counts: {
        total: items.length,
        open: items.filter((item) => item.status !== "DISMISSED").length,
      },
    });
  }),
  http.post("/api/v1/final-review/findings/:fid/dismiss", ({ params }) => {
    const findingId = String(params.fid);
    const finding = findings.get(findingId);
    if (!finding) {
      return error(404, "NOT_FOUND", "Finding not found.");
    }
    const updated = { ...finding, status: "DISMISSED" };
    findings.set(findingId, updated);
    return HttpResponse.json(updated);
  }),
  // Exports
  http.post(
    "/api/v1/projects/:id/exports",
    async ({ params, request }) => {
      const projectId = String(params.id);
      if (!projects.has(projectId)) {
        return error(404, "NOT_FOUND", "Project not found.");
      }
      const body = (await request.json().catch(() => ({}))) as {
        format?: string;
      };
      if (body.format !== "DOCX") {
        return error(
          422,
          "VALIDATION_ERROR",
          "Only DOCX exports are supported.",
        );
      }
      if (
        !projectSections(projectId).some(
          (section) => section.status === "APPROVED",
        )
      ) {
        return error(
          409,
          "NOTHING_APPROVED",
          "Approve a section before exporting.",
        );
      }
      const exportId = crypto.randomUUID();
      const created: ResourceRecord = {
        id: exportId,
        project_id: projectId,
        format: "DOCX",
        status: "QUEUED",
        file_name: `report-${exportId}.docx`,
        warnings: [],
        page_count: null,
        file_size: null,
        created_at: timestamp(),
        completed_at: null,
      };
      exportsById.set(exportId, created);
      const job = createJob({
        job_type: "export_docx",
        project_id: projectId,
        resource_type: "export",
        resource_id: exportId,
        export_id: exportId,
      });
      return HttpResponse.json(
        {
          ...asyncJobResponse(job),
          export: created,
        },
        { status: 202 },
      );
    },
  ),
  http.get("/api/v1/projects/:id/exports", ({ params }) => {
    const projectId = String(params.id);
    if (!projects.has(projectId)) {
      return error(404, "NOT_FOUND", "Project not found.");
    }
    return HttpResponse.json({
      items: [...exportsById.values()].filter(
        (item) => item.project_id === projectId,
      ),
    });
  }),
  http.get("/api/v1/exports/:eid/download", ({ params }) => {
    const exportId = String(params.eid);
    const item = exportsById.get(exportId);
    if (!item) {
      return error(404, "NOT_FOUND", "Export not found.");
    }
    if (item.status !== "READY") {
      return error(
        409,
        "EXPORT_NOT_READY",
        "The export is not ready to download.",
      );
    }
    return HttpResponse.json({
      url: `https://mock-download.local/${exportId}`,
      expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
    });
  }),
  // Usage
  http.get("/api/v1/projects/:id/usage", ({ params }) => {
    if (!projects.has(String(params.id))) {
      return error(404, "NOT_FOUND", "Project not found.");
    }
    return HttpResponse.json({
      total_estimated_cost_inr: 0,
      by_job_type: {},
      events: [],
    });
  }),
];
