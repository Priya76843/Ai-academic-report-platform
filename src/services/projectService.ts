import type {
  CreateProjectRequest,
  Project,
  ProjectListResponse,
} from "../types/project"

const API_BASE = "/api/v1"

export interface ApiErrorDetails {
  fields?: Record<string, string>
  [key: string]: unknown
}

export interface ApiErrorResponse {
  error: {
    code: string
    message: string
    details?: ApiErrorDetails
  }
  request_id?: string
}

export class ApiError extends Error {
  code: string
  details?: ApiErrorDetails
  requestId?: string

  constructor(errorResponse: ApiErrorResponse) {
    super(errorResponse.error.message)

    this.name = "ApiError"
    this.code = errorResponse.error.code
    this.details = errorResponse.error.details
    this.requestId = errorResponse.request_id
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return response.json()
  }

  const errorBody: ApiErrorResponse | null = await response
    .json()
    .catch(() => null)

  if (errorBody?.error) {
    throw new ApiError(errorBody)
  }

  throw new Error(
    `Request failed with status ${response.status}`,
  )
}

export async function getProjects(
  page = 1,
  pageSize = 20,
): Promise<ProjectListResponse> {
  const response = await fetch(
    `${API_BASE}/projects?page=${page}&page_size=${pageSize}`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    },
  )

  return handleResponse<ProjectListResponse>(response)
}

export async function createProject(
  data: CreateProjectRequest,
  idempotencyKey: string,
): Promise<Project> {
  const response = await fetch(`${API_BASE}/projects`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(data),
  })

  return handleResponse<Project>(response)
}