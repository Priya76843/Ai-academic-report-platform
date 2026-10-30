import { afterEach, describe, expect, it } from "vitest";
import {
  clearTrackedJobs,
  getActiveTrackedJobs,
  getTrackedJobs,
  registerJob,
  removeTrackedJob,
  subscribeToJobs,
  updateTrackedJob,
} from "./jobRegistry";

afterEach(() => {
  clearTrackedJobs();
});

describe("jobRegistry", () => {
  const envelope = (
    job_id: string,
    status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "RETRYING" = "QUEUED",
  ) => ({
    job_id,
    job_type: "SECTION_GENERATE",
    status,
  });

  it("registers a job returned by the API", () => {
    registerJob(envelope("job-1"), "project-1");

    expect(getTrackedJobs()).toHaveLength(1);
    expect(getTrackedJobs()[0]).toMatchObject({
      jobId: "job-1",
      projectId: "project-1",
      jobType: "SECTION_GENERATE",
      status: "QUEUED",
    });
  });

  it("does not duplicate a job ID", () => {
    registerJob(envelope("job-1"), "project-1");
    registerJob(envelope("job-1", "RUNNING"), "project-1");

    expect(getTrackedJobs()).toHaveLength(1);
    expect(getTrackedJobs()[0].status).toBe("RUNNING");
  });

  it("returns only active jobs", () => {
    registerJob(envelope("job-1", "RUNNING"), "project-1");
    registerJob(envelope("job-2", "SUCCEEDED"), "project-1");
    registerJob(envelope("job-3", "RETRYING"), "project-2");

    expect(getActiveTrackedJobs().map((job) => job.jobId)).toEqual([
      "job-1",
      "job-3",
    ]);
  });

  it("updates a registered job status", () => {
    registerJob(envelope("job-1"), "project-1");

    updateTrackedJob("job-1", "SUCCEEDED");

    expect(getTrackedJobs()[0].status).toBe("SUCCEEDED");
    expect(getActiveTrackedJobs()).toHaveLength(0);
  });

  it("notifies subscribers when the registry changes", () => {
    let notifications = 0;
    const unsubscribe = subscribeToJobs(() => {
      notifications += 1;
    });

    registerJob(envelope("job-1"), "project-1");
    updateTrackedJob("job-1", "RUNNING");
    removeTrackedJob("job-1");

    unsubscribe();

    expect(notifications).toBe(3);
  });

  it("removes a registered job", () => {
    registerJob(envelope("job-1"), "project-1");

    removeTrackedJob("job-1");

    expect(getTrackedJobs()).toHaveLength(0);
  });

  it("clears the registry", () => {
    registerJob(envelope("job-1"), "project-1");
    registerJob(envelope("job-2"), "project-1");

    clearTrackedJobs();

    expect(getTrackedJobs()).toHaveLength(0);
  });
});
