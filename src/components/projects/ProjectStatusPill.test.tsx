import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import ProjectStatusPill from "./ProjectStatusPill"

describe("ProjectStatusPill", () => {
  it("shows Draft for DRAFT status", () => {
    render(<ProjectStatusPill status="DRAFT" />)

    expect(screen.getByText("Draft")).toBeInTheDocument()
  })

  it("shows Completed for COMPLETED status", () => {
    render(<ProjectStatusPill status="COMPLETED" />)

    expect(
      screen.getByText("Completed"),
    ).toBeInTheDocument()
  })
})