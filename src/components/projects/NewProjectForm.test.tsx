import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import NewProjectForm from "./NewProjectForm"
import { createProject } from "../../services/projectService"

vi.mock("../../services/projectService", () => ({
  ApiError: class ApiError extends Error {},
  createProject: vi.fn(),
}))

describe("NewProjectForm submission", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates one project and sends one idempotency key on double submit", async () => {
    let resolveRequest!: (
      project: Awaited<ReturnType<typeof createProject>>,
    ) => void

    const pendingRequest = new Promise<
      Awaited<ReturnType<typeof createProject>>
    >((resolve) => {
      resolveRequest = resolve
    })

    vi.mocked(createProject).mockReturnValue(pendingRequest)

    render(
      <MemoryRouter>
        <NewProjectForm />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText(/project title/i), {
      target: { value: "Test Project" },
    })

    fireEvent.change(screen.getByLabelText(/topic in one line/i), {
      target: { value: "Testing duplicate submissions" },
    })

    const form = screen
      .getByRole("button", { name: /create project/i })
      .closest("form")

    if (!form) throw new Error("Project form not found")

    // Submit twice before the first request resolves.
    fireEvent.submit(form)
    fireEvent.submit(form)

    await waitFor(() => {
      expect(createProject).toHaveBeenCalledTimes(1)
    })

    const [, idempotencyKey] =
      vi.mocked(createProject).mock.calls[0]

    expect(idempotencyKey).toEqual(expect.any(String))
    expect(idempotencyKey.length).toBeGreaterThan(0)

    resolveRequest({ id: "project-123" } as Awaited<
      ReturnType<typeof createProject>
    >)
  })
})