import { describe, expect, it } from "vitest"

import { projectSchema } from "./projectSchema"

describe("projectSchema", () => {
  it("accepts a valid project", () => {
    const result = projectSchema.safeParse({
      report_type: "PROJECT_REPORT",
      title: "AI Academic Report Platform",
      topic: "Automated academic report generation",
      description: "A platform for generating academic reports.",
      target_pages: 55,
      citation_style: "IEEE",
    })

    expect(result.success).toBe(true)
  })

  it("requires a title", () => {
    const result = projectSchema.safeParse({
      report_type: "PROJECT_REPORT",
      title: "",
      topic: "Academic report generation",
    })

    expect(result.success).toBe(false)
  })

  it("requires a topic", () => {
    const result = projectSchema.safeParse({
      report_type: "PROJECT_REPORT",
      title: "Test Project",
      topic: "",
    })

    expect(result.success).toBe(false)
  })

  it("rejects target pages below 10", () => {
    const result = projectSchema.safeParse({
      report_type: "PROJECT_REPORT",
      title: "Test Project",
      topic: "Test topic",
      target_pages: 5,
    })

    expect(result.success).toBe(false)
  })

  it("rejects target pages above 300", () => {
    const result = projectSchema.safeParse({
      report_type: "PROJECT_REPORT",
      title: "Test Project",
      topic: "Test topic",
      target_pages: 301,
    })

    expect(result.success).toBe(false)
  })
})