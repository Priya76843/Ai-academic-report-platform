import { http, HttpResponse } from "msw";
import { user } from "./fixtures";
import type { ErrorEnvelope, Project, Source } from "@/lib/api/types";
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
let nextAuthError: "RATE_LIMITED" | null = null;

export const mockState = {
  signOut() {
    signedIn = false;
  },

  signIn() {
    signedIn = true;
  },

  setNextAuthError(code: "RATE_LIMITED" | null) {
    nextAuthError = code;
  },

  isSignedIn() {
    return signedIn;
  },

  resetJob() {
    resourceMockState.resetJobs();
  },

  resetProjects() {
    resourceMockState.resetProjects();
  },

  getSources(projectId: string) {
    return resourceMockState.getSources(projectId);
  },

  setSources(nextSources: Source[]) {
    resourceMockState.setSources(nextSources);
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
    nextAuthError = null;
    resourceMockState.reset();
  },
};

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isSignedInError = () =>
  envelope(401, "UNAUTHENTICATED", "Please sign in.");
// These simulate API responses they do not create real browser cookies.

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
    };

    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    const fields: Record<string, string> = {};

    if (!email || !isValidEmail(email)) {
      fields.email = "Enter a valid email address.";
    }

    if (!password || password.length < 10 || password.length > 128) {
      fields.password = "Password must be 10–128 characters.";
    }

    if (Object.keys(fields).length > 0) {
      return envelope(
        422,
        "VALIDATION_ERROR",
        "Please check your registration details.",
        { fields },
      );
    }

    if (email === user.email.trim().toLowerCase()) {
      return envelope(
        409,
        "EMAIL_TAKEN",
        "An account with this email already exists.",
      );
    }

    signedIn = true;

    return HttpResponse.json(
      {
        ...user,
        email,
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

    const email = body.email?.trim().toLowerCase();
    const fields: Record<string, string> = {};

    if (!email) {
      fields.email = "Email is required.";
    } else if (!isValidEmail(email)) {
      fields.email = "Enter a valid email address.";
    }

    if (!body.password) {
      fields.password = "Password is required.";
    }

    if (Object.keys(fields).length > 0) {
      return envelope(
        422,
        "VALIDATION_ERROR",
        "Please check your login details.",
        { fields },
      );
    }

    if (nextAuthError === "RATE_LIMITED") {
      nextAuthError = null;

      return envelope(
        429,
        "RATE_LIMITED",
        "Too many attempts. Please wait before trying again.",
      );
    }

    // no stored password, so this mock cannot verify real credentials.  non-matching email simulates invalid credentials.
    if (email !== user.email.trim().toLowerCase()) {
      return envelope(
        401,
        "INVALID_CREDENTIALS",
        "Invalid email or password.",
      );
    }

    signedIn = true;

    return HttpResponse.json({
      ...user,
      email,
    });
  }),

  // Authentication: current user
  http.get("/api/v1/auth/me", () => {
    if (!signedIn) {
      return isSignedInError();
    }

    return HttpResponse.json(user);
  }),

  // Authentication: logout
  http.post("/api/v1/auth/logout", () => {
    signedIn = false;

    // Logout always succeeds and is idempotent.
    return new HttpResponse(null, { status: 204 });
  }),

  // List projects using the shared resource state
  http.get("/api/v1/projects", ({ request }) => {
    if (!signedIn) {
      return isSignedInError();
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
      return isSignedInError();
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
      return isSignedInError();
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
