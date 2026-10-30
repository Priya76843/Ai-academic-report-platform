import type { AsyncEnvelope } from "@/lib/api/types";
import { registerJob } from "@/lib/jobs/jobRegistry";
export function trackJobCreation(
  response: AsyncEnvelope,
  projectId: string | null,
): AsyncEnvelope {
  registerJob(response, projectId);
  return response;
}
