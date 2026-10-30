// Polls active jobs every 2 seconds and synchronizes tracked jobs
// with the API's latest status. Resource state remains API-owned.
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { queries } from "@/lib/api/queries";
import {
  updateTrackedJob,
} from "@/lib/jobs/jobRegistry";
import type { Job } from "@/lib/api/types";

const ACTIVE = new Set(["QUEUED", "RUNNING", "RETRYING"]);

export const isJobActive = (
  job: Job | undefined | null,
) => !!job && ACTIVE.has(job.status);

export function useJob(jobId: string | null | undefined) {
  const q = useQuery({
    ...queries.job(jobId ?? ""),
    enabled: !!jobId,
    refetchInterval: (query) =>
      isJobActive(query.state.data) ? 2000 : false,
  });

  useEffect(() => {
    if (jobId && q.data) {
      updateTrackedJob(jobId, q.data.status);
    }
  }, [jobId, q.data?.status]);

  return {
    job: q.data,
    active: isJobActive(q.data),
    done: !!q.data && !isJobActive(q.data),
    error: q.error,
  };
}
