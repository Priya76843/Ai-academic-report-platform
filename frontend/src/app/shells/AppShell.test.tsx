import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./AppShell";
import { project } from "@/mocks/fixtures";
import { clearTrackedJobs, registerJob } from "@/lib/jobs/jobRegistry";
import { mockState } from "@/mocks/handlers";

function renderShell(path = `/projects/${project.id}/setup`) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/projects" element={<p>Projects page</p>} />
            <Route path="/projects/:projectId/setup" element={<p>Setup page</p>} />
            <Route path="/projects/:projectId/sources" element={<p>Sources page</p>} />
            <Route path="/projects/:projectId/plan" element={<p>Plan page</p>} />
            <Route path="/projects/:projectId/sections/:sectionId" element={<p>Chapter page</p>} />
            <Route path="/projects/:projectId/final-review" element={<p>Final review page</p>} />
            <Route path="/projects/:projectId/export" element={<p>Export page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockState.reset();
  clearTrackedJobs();
});

afterEach(() => {
  cleanup();
  clearTrackedJobs();
});

describe("F-02 AppShell", () => {
  it("renders project navigation and the current page", async () => {
    renderShell();

    expect(await screen.findByText("Setup page")).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Project steps" })).toBeTruthy();
    expect(screen.getByText("Final review")).toBeTruthy();
  });

  it("shows the caught-up state when there are no active jobs", async () => {
    renderShell();

    expect(await screen.findByRole("button", { name: "All caught up" })).toBeTruthy();
  });

  it("shows active jobs for the current project", async () => {
    registerJob(
      {
        job_id: "job-shell-1",
        job_type: "SECTION_GENERATE",
        status: "RUNNING",
      },
      project.id,
    );

    renderShell();

    expect(
      await screen.findByRole("button", { name: "1 jobs running" }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "1 jobs running" }));

    expect(screen.getByRole("heading", { name: "Active jobs" })).toBeTruthy();
    expect(screen.getByText("SECTION GENERATE")).toBeTruthy();
  });

  it("does not count jobs from another project", async () => {
    registerJob(
      {
        job_id: "job-other-1",
        job_type: "SECTION_GENERATE",
        status: "RUNNING",
      },
      "another-project",
    );

    renderShell();

    expect(
      await screen.findByRole("button", { name: "All caught up" }),
    ).toBeTruthy();
  });

  it("uses the API readiness field to unlock the plan step", async () => {
    renderShell();

    const planLink = await screen.findByRole("link", { name: /Plan/ });

    await waitFor(() => {
      expect(planLink).toBeTruthy();
    });
  });

  it("has a mobile navigation toggle", async () => {
    renderShell();

    expect(
      await screen.findByRole("button", { name: "Open navigation" }),
    ).toBeTruthy();
  });

  it("shows unfinished main navigation items as disabled", async () => {
    renderShell("/projects");

    expect(await screen.findByText("Projects page")).toBeTruthy();

    expect(
      screen.getByRole("navigation", { name: "Main navigation" }),
    ).toBeTruthy();

    expect(screen.getByText("Templates library")).toBeTruthy();
    expect(screen.getByText("Usage")).toBeTruthy();

    expect(screen.getAllByText("Slice 2+")).toHaveLength(2);

    expect(
      screen.queryByRole("link", { name: "Templates library" }),
    ).toBeNull();

    expect(
      screen.queryByRole("link", { name: "Usage" }),
    ).toBeNull();
  });
});
