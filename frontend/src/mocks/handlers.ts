import { http, HttpResponse } from "msw";
import { job, project, user } from "./fixtures";
import type {
  CitationStyle,
  ErrorEnvelope,
  Project,
  ReportType,
} from "@/lib/api/types";

const envelope = (
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

let signedIn = true;
let jobPolls = 0;
let projects: Project[] = [project];

// Mock state is intentionally in memory. Reset it between tests.
// Keep the API contract as the source of truth for response shapes.
const idempotencyResponses = new Map<string, Project>();
let idempotencyKeys: string[] = [];
let failNextCreate = false;
let nextValidationErrors: Record<string, string> | null = null;

interface CreateProjectBody {
  report_type?: ReportType;
  title?: string;
  topic?: string;
  description?: string | null;
  target_pages?: number;
  citation_style?: CitationStyle;
}

export const mockState = {
  signOut() {
    signedIn = false;
  },

  signIn() {
    signedIn = true;
  },

  resetJob() {
    jobPolls = 0;
  },

  resetProjects() {
    projects = [project];
    idempotencyResponses.clear();
    idempotencyKeys = [];
    failNextCreate = false;
    nextValidationErrors = null;
  },

  setProjects(nextProjects: Project[]) {
    projects = [...nextProjects];
  },

  failNextCreateOnce() {
    failNextCreate = true;
  },

  setNextCreateValidationError(fields: Record<string, string>) {
    nextValidationErrors = fields;
  },

  getIdempotencyKeys() {
    return [...idempotencyKeys];
  },
};

export const handlers = [
  http.get("/api/v1/health", () =>
    HttpResponse.json({
      status: "ok",
      version: "mock",
    }),
  ),

  http.get("/api/v1/auth/me", () =>
    signedIn
      ? HttpResponse.json(user)
      : envelope(
          401,
          "UNAUTHENTICATED",
          "Sign in to continue.",
        ),
  ),

  http.post("/api/v1/auth/logout", () => {
    signedIn = false;
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/v1/projects", ({ request }) => {
    const url = new URL(request.url);

    const requestedPage = Number(
      url.searchParams.get("page") ?? 1,
    );
    const requestedPageSize = Number(
      url.searchParams.get("page_size") ?? 20,
    );

    const page =
      Number.isFinite(requestedPage) && requestedPage >= 1
        ? Math.floor(requestedPage)
        : 1;

    const pageSize =
      Number.isFinite(requestedPageSize) &&
      requestedPageSize >= 1
        ? Math.min(Math.floor(requestedPageSize), 100)
        : 20;

    const start = (page - 1) * pageSize;

    return HttpResponse.json({
      items: projects.slice(start, start + pageSize),
      page,
      page_size: pageSize,
      total: projects.length,
    });
  }),

  http.get("/api/v1/projects/:id", ({ params }) => {
    const found = projects.find(
      (item) => item.id === params.id,
    );

    return found
      ? HttpResponse.json(found)
      : envelope(404, "NOT_FOUND", "Project not found.");
  }),

  http.post("/api/v1/projects", async ({ request }) => {
    const idempotencyKey =
      request.headers.get("Idempotency-Key") ?? "";

    if (idempotencyKey) {
      idempotencyKeys.push(idempotencyKey);
    }

    // Simulate a lost response so the UI can retry the same request.
    if (failNextCreate) {
      failNextCreate = false;
      return HttpResponse.error();
    }

    // Replay the original successful response for a repeated key.
    if (
      idempotencyKey &&
      idempotencyResponses.has(idempotencyKey)
    ) {
      return HttpResponse.json(
        idempotencyResponses.get(idempotencyKey)!,
        { status: 201 },
      );
    }

    let body: CreateProjectBody;

    try {
      body = (await request.json()) as CreateProjectBody;
    } catch {
      return envelope(
        422,
        "VALIDATION_ERROR",
        "Request body must be valid JSON.",
      );
    }

    // Test hook for verifying server-side field-error mapping.
    if (nextValidationErrors) {
      const fields = nextValidationErrors;
      nextValidationErrors = null;

      return envelope(
        422,
        "VALIDATION_ERROR",
        "Please correct the highlighted fields.",
        fields,
      );
    }

    const fields: Record<string, string> = {};

    const title = body.title?.trim() ?? "";
    const topic = body.topic?.trim() ?? "";

    if (title.length < 5 || title.length > 255) {
      fields.title =
        "Title must be between 5 and 255 characters.";
    }

    if (topic.length < 1 || topic.length > 500) {
      fields.topic =
        "Topic must be between 1 and 500 characters.";
    }

    if (
      body.description != null &&
      body.description.length > 5000
    ) {
      fields.description =
        "Description must not exceed 5000 characters.";
    }

    if (
      !Number.isInteger(body.target_pages) ||
      (body.target_pages ?? 0) < 10 ||
      (body.target_pages ?? 0) > 300
    ) {
      fields.target_pages =
        "Target pages must be between 10 and 300.";
    }

    if (
      !["PROJECT_REPORT", "SEMINAR_REPORT"].includes(
        body.report_type ?? "",
      )
    ) {
      fields.report_type = "Select a valid report type.";
    }

    if (
      !["IEEE", "APA"].includes(body.citation_style ?? "")
    ) {
      fields.citation_style = "Select a valid citation style.";
    }

    if (Object.keys(fields).length > 0) {
      return envelope(
        422,
        "VALIDATION_ERROR",
        "Please correct the highlighted fields.",
        fields,
      );
    }

    const now = new Date().toISOString();

    const created: Project = {
      id: crypto.randomUUID(),
      report_type: body.report_type!,
      title,
      topic,
      description: body.description?.trim() || null,
      target_pages: body.target_pages!,
      citation_style: body.citation_style!,
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

    projects = [created, ...projects];

    if (idempotencyKey) {
      idempotencyResponses.set(idempotencyKey, created);
    }

    return HttpResponse.json(created, { status: 201 });
  }),

  http.get("/api/v1/jobs/:id", () => {
    jobPolls += 1;

    if (jobPolls === 1) {
      return HttpResponse.json(job("QUEUED"));
    }

    if (jobPolls <= 3) {
      return HttpResponse.json(job("RUNNING", "DRAFTING"));
    }

    return HttpResponse.json(job("SUCCEEDED"));
  }),
];
