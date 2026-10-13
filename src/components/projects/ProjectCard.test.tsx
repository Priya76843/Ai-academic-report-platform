
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"

import ProjectCard from "./ProjectCard"
import type { Project } from "../../types/project"
import * as projectService from "../../services/projectService"

const mockProject = {
  id: "project-123",
  title: "Test Project",
  report_type: "PROJECT_REPORT",
  status: "DRAFT",
  template_name: "IEEE",
  target_pages: 55,
  source_counts: { total: 2 },
  sections_approved: 1,
  sections_total: 9,
  updated_at: "2026-10-10T10:00:00Z",
} as Project

describe("ProjectCard", () => {
  it("renders project details without making API calls", () => {
    const getProjectsSpy = vi.spyOn(projectService, "getProjects")

    render(
      <MemoryRouter>
        <ProjectCard project={mockProject} />
      </MemoryRouter>,
    )

    expect(screen.getByText("Test Project")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
    expect(getProjectsSpy).not.toHaveBeenCalled()

    getProjectsSpy.mockRestore()
  })
})
