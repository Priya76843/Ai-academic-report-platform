import { z } from "zod"

export const projectSchema = z.object({
  report_type: z.enum(["PROJECT_REPORT", "SEMINAR_REPORT"]),

  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(255, "Title must not exceed 255 characters"),

  topic: z
    .string()
    .trim()
    .min(1, "Topic is required")
    .max(500, "Topic must not exceed 500 characters"),

  description: z
    .string()
    .trim()
    .max(5000, "Description must not exceed 5000 characters")
    .optional(),

  target_pages: z
    .number()
    .int("Target pages must be a whole number")
    .min(10, "Target pages must be between 10 and 300")
    .max(300, "Target pages must be between 10 and 300")
    .optional(),

  citation_style: z.enum(["IEEE", "APA"]).optional(),
})

export type ProjectFormValues = z.infer<typeof projectSchema>