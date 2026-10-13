import { http, HttpResponse } from "msw"
import { mockProjects } from "./projects"

type CreateProjectBody = {
  report_type: "PROJECT_REPORT" | "SEMINAR_REPORT"
  title: string
  topic: string
  description?: string
  target_pages?: number
  citation_style?: "IEEE" | "APA"
}

const createdResponses = new Map<
  string,
  ReturnType<typeof HttpResponse.json>
>()

export const handlers = [
  http.get("/api/v1/projects", ({ request }) => {
    const url = new URL(request.url)

    const page = Math.max(
      1,
      Number(url.searchParams.get("page") ?? "1"),
    )

    const pageSize = Math.max(
      1,
      Number(url.searchParams.get("page_size") ?? "20"),
    )

    const allProjects = [...mockProjects]
    const start = (page - 1) * pageSize

    return HttpResponse.json({
      items: allProjects.slice(start, start + pageSize),
      page,
      page_size: pageSize,
      total: allProjects.length,
    })
  }),

  http.post("/api/v1/projects", async ({ request }) => {
    const idempotencyKey = request.headers.get("Idempotency-Key")

    if (!idempotencyKey) {
      return HttpResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Idempotency-Key header is required.",
          },
        },
        { status: 422 },
      )
    }

    const existingResponse = createdResponses.get(idempotencyKey)

    if (existingResponse) {
      return existingResponse
    }

    const body = (await request.json()) as CreateProjectBody

    if (!body.title || body.title.length < 5 || !body.topic) {
      return HttpResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Please check the project fields.",
            details: {
              fields: {
                ...(!body.title || body.title.length < 5
                  ? {
                      title:
                        "Project title must be at least 5 characters.",
                    }
                  : {}),
                ...(!body.topic
                  ? { topic: "Topic is required." }
                  : {}),
              },
            },
          },
        },
        { status: 422 },
      )
    }

    const now = new Date().toISOString()

    const newProject = {
      id: crypto.randomUUID(),
      report_type: body.report_type,
      title: body.title,
      topic: body.topic,
      description: body.description ?? "",
      target_pages: body.target_pages,
      citation_style: body.citation_style,
      status: "DRAFT" as const,
      template_name: undefined,
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
      logo_asset_id: undefined,
      created_at: now,
      updated_at: now,
    }

    mockProjects.unshift(newProject)

    const response = HttpResponse.json(newProject, { status: 201 })
    createdResponses.set(idempotencyKey, response)

    return response
  }),
]
