import type { Job, Project, User } from "@/lib/api/types";

export const user: User = { id: "8d2f8e5c-9d91-4c62-9e1e-2e3f2c0a1b44", email: "priya.s@college.example", created_at: "2026-09-15T20:20:00Z" };

export const project: Project = {
  id: "7a7d6e2e-3c45-4f1c-a8d2-1e6a58c9b121", report_type: "PROJECT_REPORT", title: "Face Recognition Based Attendance System",
  topic: "Face recognition based attendance", description: "Classroom camera captures faces…", target_pages: 55, citation_style: "IEEE",
  status: "IN_REVIEW", template_name: "VTU Project Report Format 2024",
  source_counts: { PAPER: 1, PAPER_LINK: 1, COLLEGE_FORMAT: 1, SOURCE_CODE: 1, SCREENSHOT: 4, total: 8 },
  sections_approved: 1, sections_total: 9, details: {}, logo_asset_id: null,
  created_at: "2026-09-16T11:10:00Z", updated_at: "2026-10-06T16:48:00Z",
};

export const job = (status: Job["status"], step?: string): Job => ({
  id: "d4e5f6a7-0000-4000-8000-000000000001", project_id: project.id, job_type: "generate_section", status,
  progress: step ? { step, completed: 1, total: 3 } : {}, resource_type: "section", resource_id: "sec-1", attempt: 1,
  error: status === "FAILED" ? { category: "citation_validation", message: "The draft cited something not in your sources; try again." } : null,
  created_at: "2026-10-06T16:40:00Z", started_at: "2026-10-06T16:40:02Z", completed_at: status === "SUCCEEDED" || status === "FAILED" ? "2026-10-06T16:40:20Z" : null,
});
