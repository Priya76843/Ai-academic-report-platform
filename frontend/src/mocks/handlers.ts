// MSW handlers built from api-contracts-v1. F-01 extends these to every endpoint with realistic state
// progressions. Handlers hold a tiny in-memory state so repeated polls advance (QUEUED → RUNNING → SUCCEEDED).
import { http, HttpResponse } from "msw";
import { job, project, user } from "./fixtures";
import type { ErrorEnvelope } from "@/lib/api/types";

const envelope = (status: number, code: string, message: string, fields?: Record<string, string>) =>
  HttpResponse.json<ErrorEnvelope>({ error: { code, message, details: fields ? { fields } : {} }, request_id: crypto.randomUUID() }, { status });

let signedIn = true;
let jobPolls = 0;

export const mockState = {
  signOut() { signedIn = false; },
  signIn() { signedIn = true; },
  resetJob() { jobPolls = 0; },
};

export const handlers = [
  http.get("/api/v1/health", () => HttpResponse.json({ status: "ok", version: "mock" })),
  http.get("/api/v1/auth/me", () => (signedIn ? HttpResponse.json(user) : envelope(401, "UNAUTHENTICATED", "Sign in to continue."))),
  http.post("/api/v1/auth/logout", () => { signedIn = false; return new HttpResponse(null, { status: 204 }); }),
  http.get("/api/v1/projects", () => HttpResponse.json({ items: [project], page: 1, page_size: 20, total: 1 })),
  http.get("/api/v1/projects/:id", ({ params }) => (params.id === project.id ? HttpResponse.json(project) : envelope(404, "NOT_FOUND", "Project not found."))),
  http.get("/api/v1/jobs/:id", () => {
    jobPolls += 1;
    if (jobPolls === 1) return HttpResponse.json(job("QUEUED"));
    if (jobPolls <= 3) return HttpResponse.json(job("RUNNING", "DRAFTING"));
    return HttpResponse.json(job("SUCCEEDED"));
  }),
];
