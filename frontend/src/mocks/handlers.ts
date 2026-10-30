import { http, HttpResponse } from "msw";
import { user } from "./fixtures";
import type { ErrorEnvelope, Project } from "@/lib/api/types";
import {
  resourceHandlers,
  resourceMockState,
} from "./resource-handlers";

const envelope = (
  status: number,
  code: string,
  message: string,
  details: Record<string, unknown> = {},
) =>
  HttpResponse.json<ErrorEnvelope>(
    {
      error: { code, message, details },
      request_id: crypto.randomUUID(),
    },
    { status },
  );

let signedIn = true;

export const mockState = {
  signOut() {
    signedIn = false;
  },

  signIn() {
    signedIn = true;
  },

  resetJob() {
    resourceMockState.resetJobs();
  },

  resetProjects() {
    resourceMockState.resetProjects();
  },

  setProjects(nextProjects: Project[]) {
    resourceMockState.setProjects(nextProjects);
  },

  failNextCreateOnce() {
    resourceMockState.failNextCreateOnce();
  },

  setNextCreateValidationError(fields: Record<string, string>) {
    resourceMockState.setNextCreateValidationError(fields);
  },

  getIdempotencyKeys() {
    return resourceMockState.getIdempotencyKeys();
  },

  reset() {
    signedIn = true;
    resourceMockState.reset();
  },
};

export const handlers = [
  // Health
  http.get("/api/v1/health", () =>
    HttpResponse.json({
      status: "ok",
      version: "0.1.0",
    }),
  ),

  // Authentication: register
  http.post("/api/v1/auth/register", async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
      name?: string;
    };

    if (!body.email || !body.password || body.password.length < 8) {
      return envelope(
        422,
        "VALIDATION_ERROR",
        "Provide a valid email and a password with at least 8 characters.",
      );
    }

    signedIn = true;

    return HttpResponse.json(
      {
        ...user,
        email: body.email,
        ...(body.name ? { name: body.name } : {}),
      },
      { status: 201 },
    );
  }),

  // Authentication: login
  http.post("/api/v1/auth/login", async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
    };

    if (!body.email || !body.password) {
      return envelope(
        422,
        "VALIDATION_ERROR",
        "Email and password are required.",
      );
    }

    signedIn = true;

    return HttpResponse.json({
      ...user,
      email: body.email,
    });
  }),

  // Authentication: current user
  http.get("/api/v1/auth/me", () => {
    if (!signedIn) {
      return envelope(
        401,
        "UNAUTHENTICATED",
        "Please sign in.",
      );
    }

    return HttpResponse.json(user);
  }),

  // Authentication: logout
  http.post("/api/v1/auth/logout", () => {
    signedIn = false;
    return new HttpResponse(null, { status: 204 });
  }),

  // List projects using the shared resource state
  http.get("/api/v1/projects", ({ request }) => {
    if (!signedIn) {
      return envelope(
        401,
        "UNAUTHENTICATED",
        "Please sign in.",
      );
    }

    const url = new URL(request.url);

    const page = Math.max(
      1,
      Number(url.searchParams.get("page")) || 1,
    );

    const pageSize = Math.min(
      100,
      Math.max(
        1,
        Number(url.searchParams.get("page_size")) || 20,
      ),
    );

    return HttpResponse.json(
      resourceMockState.listProjects(page, pageSize),
    );
  }),

  // Get one project
  http.get("/api/v1/projects/:id", ({ params }) => {
    if (!signedIn) {
      return envelope(
        401,
        "UNAUTHENTICATED",
        "Please sign in.",
      );
    }

    const found = resourceMockState.getProject(String(params.id));

    if (!found) {
      return envelope(
        404,
        "NOT_FOUND",
        "Project not found.",
      );
    }

    return HttpResponse.json(found);
  }),

  // Poll registered jobs
  http.get("/api/v1/jobs/:id", ({ params }) => {
    if (!signedIn) {
      return envelope(
        401,
        "UNAUTHENTICATED",
        "Please sign in.",
      );
    }

    const result = resourceMockState.pollJob(String(params.id));

    if (!result) {
      return envelope(
        404,
        "NOT_FOUND",
        "Job not found.",
      );
    }

    return HttpResponse.json(result);
  }),

  // Remaining resource endpoints, including project creation
  ...resourceHandlers,
];
