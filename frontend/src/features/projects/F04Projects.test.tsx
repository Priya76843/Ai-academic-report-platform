import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { NewProjectPage } from "./NewProjectPage";
import { ProjectsPage } from "./ProjectsPage";
import { mockState } from "@/mocks/handlers";

function renderPage(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/new" element={<NewProjectPage />} />
          <Route
            path="/projects/:projectId/setup"
            element={<p>Setup route reached</p>}
          />
          <Route
            path="/projects/:projectId/sources"
            element={<p>Sources route reached</p>}
          />
          <Route
            path="/projects/:projectId/plan"
            element={<p>Plan route reached</p>}
          />
          <Route
            path="/projects/:projectId/export"
            element={<p>Export route reached</p>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText(/Project title/i), {
    target: { value: "Adaptive Learning Report" },
  });

  fireEvent.change(screen.getByLabelText(/^Topic/i), {
    target: { value: "Adaptive learning question prediction" },
  });
}

beforeEach(() => {
  mockState.resetProjects();
});

afterEach(() => {
  cleanup();
});

describe("F-04 projects flow", () => {
  it("renders projects from the MSW mock", async () => {
    renderPage("/projects");

    expect(
      await screen.findByRole("heading", {
        name: /Face Recognition Based Attendance System/i,
      }),
    ).toBeTruthy();
  });

  it("renders the empty state when there are no projects", async () => {
    mockState.setProjects([]);

    renderPage("/projects");

    expect(
      await screen.findByText("No projects yet"),
    ).toBeTruthy();

    expect(
      screen.getByRole("link", {
        name: /Create your first project/i,
      }),
    ).toBeTruthy();
  });

  it("creates a project and navigates to setup", async () => {
    renderPage("/projects/new");

    fillValidForm();

    fireEvent.click(
      screen.getByRole("button", { name: /Create project/i }),
    );

    expect(
      await screen.findByText("Setup route reached"),
    ).toBeTruthy();
  });

  it("maps a 422 response to the corresponding field", async () => {
    mockState.setNextCreateValidationError({
      title: "This title is already in use.",
    });

    renderPage("/projects/new");

    fillValidForm();

    fireEvent.click(
      screen.getByRole("button", { name: /Create project/i }),
    );

    expect(
      await screen.findByText("This title is already in use."),
    ).toBeTruthy();

    expect(
      screen.getByLabelText(/Project title/i).getAttribute("aria-invalid"),
    ).toBe("true");

    expect(
      screen.queryByText("Please correct the highlighted fields."),
    ).toBeNull();
  });

  it("reuses the same Idempotency-Key after a network failure", async () => {
    mockState.failNextCreateOnce();

    renderPage("/projects/new");

    fillValidForm();

    fireEvent.click(
      screen.getByRole("button", { name: /Create project/i }),
    );

    expect(
      await screen.findByText(
        "Could not create the project. Please try again.",
      ),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: /Create project/i }),
    );

    expect(
      await screen.findByText("Setup route reached"),
    ).toBeTruthy();

    await waitFor(() => {
      const keys = mockState.getIdempotencyKeys();

      expect(keys).toHaveLength(2);
      expect(keys[0]).toBeTruthy();
      expect(keys[0]).toBe(keys[1]);
    });
  });
});
