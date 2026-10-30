import type { AsyncEnvelope, JobStatus } from "@/lib/api/types";
export interface TrackedJob {
  jobId: string;
  projectId: string | null;
  jobType: string;
  status: JobStatus;
  registeredAt: number;
}
const ACTIVE_STATUSES = new Set<JobStatus>([
  "QUEUED",
  "RUNNING",
  "RETRYING",
]);
let snapshot: TrackedJob[] = [];
const listeners = new Set<() => void>();
function publish(next: TrackedJob[]) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}
export function getTrackedJobs(): TrackedJob[] {
  return snapshot;
}
export function getActiveTrackedJobs(): TrackedJob[] {
  return snapshot.filter((job) => ACTIVE_STATUSES.has(job.status));
}
export function subscribeToJobs(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function registerJob(
  envelope: Pick<AsyncEnvelope, "job_id" | "job_type" | "status">,
  projectId: string | null,
): void {
  const tracked: TrackedJob = {
    jobId: envelope.job_id,
    projectId,
    jobType: envelope.job_type,
    status: envelope.status,
    registeredAt: Date.now(),
  };
  const existing = snapshot.findIndex(
    (job) => job.jobId === tracked.jobId,
  );
  if (existing >= 0) {
    publish(
      snapshot.map((job, index) =>
        index === existing ? { ...job, ...tracked } : job,
      ),
    );
    return;
  }
  publish([...snapshot, tracked]);
}
export function updateTrackedJob(
  jobId: string,
  status: JobStatus,
): void {
  const existing = snapshot.find((job) => job.jobId === jobId);
  if (!existing || existing.status === status) return;
  publish(
    snapshot.map((job) =>
      job.jobId === jobId ? { ...job, status } : job,
    ),
  );
}
export function removeTrackedJob(jobId: string): void {
  const next = snapshot.filter((job) => job.jobId !== jobId);
  if (next.length !== snapshot.length) publish(next);
}
//Test isolation
export function clearTrackedJobs(): void {
  if (snapshot.length > 0) publish([]);
}
