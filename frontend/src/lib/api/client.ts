// One fetch wrapper. Cookies ride along (same origin), every non-2xx becomes a typed ApiError built from the
// contract §1.1 envelope, and nothing else in the app parses error bodies.
import type { ErrorEnvelope } from "./types";

export const API_BASE = "/api/v1";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string>;
  readonly requestId: string | null;
  constructor(status: number, body: ErrorEnvelope | null) {
    super(body?.error.message ?? `Request failed (${status})`);
    this.status = status;
    this.code = body?.error.code ?? (status === 401 ? "UNAUTHENTICATED" : "HTTP_ERROR");
    this.fields = body?.error.details?.fields ?? {};
    this.requestId = body?.request_id ?? null;
  }
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  idempotencyKey?: string;
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers = new Headers(opts.headers);
  if (opts.body !== undefined) headers.set("Content-Type", "application/json");
  if (opts.idempotencyKey) headers.set("Idempotency-Key", opts.idempotencyKey);
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers,
    credentials: "same-origin",
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) throw new ApiError(res.status, json as ErrorEnvelope | null);
  return json as T;
}

export const newIdempotencyKey = () => crypto.randomUUID();
