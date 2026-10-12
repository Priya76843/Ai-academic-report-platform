// Polls a job every 2 s while QUEUED/RUNNING/RETRYING (contract §1.2), then stops. Callers re-fetch the resource
// when `done` flips. Never derive resource state client-side from the job.
import { useQuery } from "@tanstack/react-query";
import { queries } from "@/lib/api/queries";
import type { Job } from "@/lib/api/types";

const ACTIVE = new Set(["QUEUED", "RUNNING", "RETRYING"]);
export const isJobActive = (job: Job | undefined | null) => !!job && ACTIVE.has(job.status);

export function useJob(jobId: string | null | undefined) {
  const q = useQuery({
    ...queries.job(jobId ?? ""),
    enabled: !!jobId,
    refetchInterval: (query) => (isJobActive(query.state.data) ? 2000 : false),
  });
  return { job: q.data, active: isJobActive(q.data), done: !!q.data && !isJobActive(q.data), error: q.error };
}
