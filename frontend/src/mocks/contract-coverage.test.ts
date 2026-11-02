import { describe, expect, it } from "vitest";
import { handlers } from "./handlers";

const contractEndpoints = [
  "POST /api/v1/auth/register",
  "POST /api/v1/auth/login",
  "POST /api/v1/auth/logout",
  "GET /api/v1/auth/me",
  "GET /api/v1/projects",
  "POST /api/v1/projects",
  "GET /api/v1/projects/:id",
  "PATCH /api/v1/projects/:id",
  "DELETE /api/v1/projects/:id",
  "POST /api/v1/projects/:id/assets",
  "POST /api/v1/projects/:id/assets/:aid/complete",
  "GET /api/v1/assets/:aid/url",
  "GET /api/v1/projects/:id/sources",
  "POST /api/v1/projects/:id/sources",
  "POST /api/v1/projects/:id/sources/:sid/complete",
  "POST /api/v1/projects/:id/sources/:sid/attach-pdf",
  "GET /api/v1/projects/:id/sources/:sid",
  "DELETE /api/v1/projects/:id/sources/:sid",
  "GET /api/v1/templates/library",
  "POST /api/v1/projects/:id/template/select",
  "POST /api/v1/projects/:id/plan",
  "GET /api/v1/projects/:id/plan",
  "PATCH /api/v1/projects/:id/plan",
  "GET /api/v1/projects/:id/sections",
  "GET /api/v1/sections/:sid",
  "POST /api/v1/sections/:sid/generate",
  "POST /api/v1/sections/:sid/regenerate",
  "PUT /api/v1/sections/:sid/content",
  "POST /api/v1/sections/:sid/approve",
  "GET /api/v1/projects/:id/figures",
  "POST /api/v1/projects/:id/final-review",
  "GET /api/v1/projects/:id/final-review",
  "POST /api/v1/final-review/findings/:fid/dismiss",
  "POST /api/v1/projects/:id/exports",
  "GET /api/v1/projects/:id/exports",
  "GET /api/v1/exports/:eid/download",
  "GET /api/v1/jobs/:id",
  "GET /api/v1/projects/:id/usage",
  "GET /api/v1/health",
];


const normalizePath = (path: string) =>
  path.replace(/\/+/g, "/").replace(/:[^/]+/g, ":param");

const normalizeEndpoint = (endpoint: string) => {
  const [method, ...pathParts] = endpoint.split(" ");
  return `${method} ${normalizePath(pathParts.join(" "))}`;
};

describe("API contract mock coverage", () => {
  it("registers a handler for every frozen contract endpoint", () => {
    const registered = new Set(
      handlers.flatMap((handler) => {
        const path = handler.info.path;

        if (handler.info.method === "ALL" || typeof path !== "string") {
          return [];
        }

        return [
          `${handler.info.method} ${normalizePath(path)}`,
        ];
      }),
    );

    const missing = contractEndpoints.filter(
      (endpoint) => !registered.has(normalizeEndpoint(endpoint)),
    );

    expect(
      missing,
      `Missing mock handlers:\n${missing.join("\n")}`,
    ).toEqual([]);
  });
});
