import { describe, expect, it } from "vitest"

import {
  createProject,
  getProjects,
} from "./projectService"

describe("projectService", () => {
  it("gets projects from the API", async () => {
    const response = await getProjects()

    expect(response.items.length).toBeGreaterThan(0)
    expect(response.page).toBe(1)
    expect(response.page_size).toBe(20)
    expect(response.total).toBeGreaterThan(0)
  })

  it("creates a project", async () => {
    const project = await createProject(
      {
        report_type: "PROJECT_REPORT",
        title: "Test Academic Project",
        topic: "Testing project creation",
        description: "Test project description",
        target_pages: 55,
        citation_style: "IEEE",
      },
      crypto.randomUUID(),
    )

    expect(project.status).toBe("DRAFT")
    expect(project.title).toBe("Test Academic Project")
    expect(project.topic).toBe(
      "Testing project creation",
    )
  })
})