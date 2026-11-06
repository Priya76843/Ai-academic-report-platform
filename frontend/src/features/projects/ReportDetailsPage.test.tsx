import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";

import { ReportDetailsPage } from "./ReportDetailsPage";
import { project } from "@/mocks/fixtures";
import { mockState } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import type { Project, ReportPlan } from "@/lib/api/types";

const projectId = project.id;

let triggerImageLoad: (() => Promise<void>) | undefined;

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/projects/${projectId}/setup`]}>
        <Routes>
          <Route
            path="/projects/:projectId/setup"
            element={<ReportDetailsPage />}
          />
          <Route
            path="/projects/:projectId/sources"
            element={<div>Sources page</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function mockImageDimensions(width: number, height: number) {
  class MockImage {
    width = width;
    height = height;
    onload: (() => void | Promise<void>) | null = null;
    onerror: (() => void) | null = null;

    set src(_value: string) {
      triggerImageLoad = async () => {
        await this.onload?.();
      };
    }
  }

  vi.stubGlobal("Image", MockImage);

  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    writable: true,
    value: vi.fn(() => "blob:test-logo"),
  });

  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });
}

async function selectLogo(container: HTMLElement, file: File) {
  await waitFor(() => {
    expect(
      screen.queryByText("Loading report details..."),
    ).not.toBeInTheDocument();
  });

  const input = container.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement | null;

  if (!input) {
    throw new Error("Logo file input was not found.");
  }

  triggerImageLoad = undefined;

  fireEvent.change(input, {
    target: { files: [file] },
  });

  // Unsupported formats are rejected before an Image is created.
  if (file.type === "image/png" || file.type === "image/jpeg") {
    await waitFor(() => {
      expect(triggerImageLoad).toBeDefined();
    });

    await act(async () => {
      await triggerImageLoad?.();
    });
  }
}

describe("ReportDetailsPage", () => {
  beforeEach(() => {
    triggerImageLoad = undefined;
    mockState.reset();

    mockState.setProjects([
      {
        ...project,
        details: {
          institution: {
            college: "SDM College of Engineering and Technology",
            university: "Visvesvaraya Technological University",
            department: "Computer Science and Engineering",
            degree: "Master of Technology",
            academic_year: "2026-2027",
            semester: 3,
          },
          students: [
            { name: "Priya Hegde", usn: "1AB22CS101" },
            { name: "Student Two", usn: "1AB22CS102" },
          ],
          guide: {
            name: "Prof. Radhika Amashi",
            designation: "Assistant Professor",
          },
          hod: { name: "HOD Name" },
          principal: { name: "Principal Name" },
          instructions: "Use IEEE formatting.",
        },
      },
    ]);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    triggerImageLoad = undefined;
  });

  it("hydrates the form from the project's saved details", async () => {
    renderPage();

    expect(
      await screen.findByDisplayValue(
        "SDM College of Engineering and Technology",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByDisplayValue("Visvesvaraya Technological University"),
    ).toBeInTheDocument();

    expect(
      screen.getByDisplayValue("Computer Science and Engineering"),
    ).toBeInTheDocument();

    expect(
      screen.getByDisplayValue("Master of Technology"),
    ).toBeInTheDocument();

    expect(screen.getByDisplayValue("2026-2027")).toBeInTheDocument();
    expect(screen.getByDisplayValue("3")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Priya Hegde")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1AB22CS101")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Student Two")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1AB22CS102")).toBeInTheDocument();

    expect(
      screen.getByDisplayValue("Prof. Radhika Amashi"),
    ).toBeInTheDocument();

    expect(
      screen.getByDisplayValue("Use IEEE formatting."),
    ).toBeInTheDocument();
  });

  it("sends the details object with numeric semester and unchanged USNs", async () => {
    let receivedBody: { details?: Project["details"] } | undefined;

    server.use(
      http.patch("/api/v1/projects/:id", async ({ request }) => {
        receivedBody = (await request.json()) as {
          details?: Project["details"];
        };

        return HttpResponse.json({
          ...project,
          details: receivedBody.details ?? {},
        });
      }),
    );

    renderPage();

    const collegeInput = await screen.findByDisplayValue(
      "SDM College of Engineering and Technology",
    );

    fireEvent.change(collegeInput, {
      target: { value: "SDM Engineering College" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(receivedBody).toBeDefined();
    });

    expect(receivedBody).toEqual({
      details: expect.objectContaining({
        institution: expect.objectContaining({
          college: "SDM Engineering College",
          semester: 3,
        }),
        students: [
          { name: "Priya Hegde", usn: "1AB22CS101" },
          { name: "Student Two", usn: "1AB22CS102" },
        ],
      }),
    });

    expect(
      typeof receivedBody?.details?.institution?.semester,
    ).toBe("number");
  });

  it("shows a 422 field validation error on the corresponding field", async () => {
    server.use(
      http.patch("/api/v1/projects/:id", () =>
        HttpResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Please check the report details.",
              details: {
                fields: {
                  "details.institution.college":
                    "College name is required.",
                },
              },
            },
            request_id: "test-request",
          },
          { status: 422 },
        ),
      ),
    );

    renderPage();

    await screen.findByDisplayValue(
      "SDM College of Engineering and Technology",
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("College name is required."),
    ).toBeInTheDocument();
  });

  it("uses fallback required details when the plan is not available", async () => {
    mockState.setProjects([
      {
        ...project,
        details: {},
      },
    ]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/missing/i)).toBeInTheDocument();
    });
  });

  it("uses required details from the report plan when available", async () => {
    const plan: ReportPlan = {
      id: "test-plan-id",
      project_id: projectId,
      template_key: "vtu",
      template_name: "VTU Project Report Format",
      front_matter: [
        {
          key: "title_page",
          title: "Title Page",
          auto: false,
          required_details: ["college"],
        },
      ],
      style_summary: {
        font: "Times New Roman",
        font_size: 12,
        line_spacing: 1.5,
        margins: {
          top: 1,
          bottom: 1,
          left: 1,
          right: 1,
        },
        citation_style: "IEEE",
      },
      sections: [],
    };

    server.use(
      http.get("/api/v1/projects/:id/plan", () => {
        return HttpResponse.json(plan);
      }),
    );

    mockState.setProjects([
      {
        ...project,
        details: {},
      },
    ]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/missing/i)).toBeInTheDocument();
    });
  });

  it("uploads a logo through POST, PUT and complete", async () => {
    mockImageDimensions(400, 400);

    const uploadCalls: string[] = [];
    let uploadedFilename = "";

    server.use(
      http.post(
        "/api/v1/projects/:id/assets",
        async ({ request }) => {
          uploadCalls.push("POST");

          const body = (await request.json()) as {
            asset_type: string;
            filename: string;
            mime_type: string;
            size_bytes: number;
          };

          uploadedFilename = body.filename;

          return HttpResponse.json(
            {
              asset: {
                id: "test-logo-asset",
                project_id: projectId,
                asset_type: body.asset_type,
                filename: body.filename,
                mime_type: body.mime_type,
                size_bytes: body.size_bytes,
                width: null,
                height: null,
                status: "UPLOADED",
                created_at: new Date().toISOString(),
              },
              upload: {
                url: "https://mock-upload.local/test-logo-asset",
                method: "PUT",
                headers: {},
                expires_at: new Date(
                  Date.now() + 15 * 60_000,
                ).toISOString(),
              },
            },
            { status: 201 },
          );
        },
      ),
      http.post(
        "/api/v1/projects/:id/assets/:aid/complete",
        () => {
          uploadCalls.push("complete");

          return HttpResponse.json({
            id: "test-logo-asset",
            project_id: projectId,
            asset_type: "LOGO",
            filename: uploadedFilename,
            mime_type: "image/png",
            size_bytes: 1024,
            width: null,
            height: null,
            status: "READY",
            created_at: new Date().toISOString(),
          });
        },
      ),
    );

    class MockXMLHttpRequest {
      upload = {
        onprogress: null as
          | ((event: ProgressEvent) => void)
          | null,
      };

      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      status = 200;

      open(method: string, url: string) {
        expect(method).toBe("PUT");
        expect(url).toBe(
          "https://mock-upload.local/test-logo-asset",
        );
      }

      setRequestHeader() {}

      send() {
        uploadCalls.push("PUT");
        queueMicrotask(() => this.onload?.());
      }
    }

    vi.stubGlobal("XMLHttpRequest", MockXMLHttpRequest);

    const { container } = renderPage();

    const file = new File(["logo-image-content"], "college-logo.png", {
      type: "image/png",
    });

    await selectLogo(container, file);

    expect(
      await screen.findByRole("img", {
        name: "College logo preview",
      }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(uploadCalls).toEqual(["POST", "PUT", "complete"]);
    });

    expect(uploadedFilename).toBe("college-logo.png");
  });

  it("rejects an unsupported logo file type", async () => {
    const { container } = renderPage();

    const file = new File(["not-an-image"], "college-logo.gif", {
      type: "image/gif",
    });

    await selectLogo(container, file);

    expect(
      await screen.findByText(
        "Unsupported logo format. Please upload a PNG or JPG image.",
      ),
    ).toBeInTheDocument();
  });

  it("rejects a logo smaller than 300 by 300 pixels", async () => {
    mockImageDimensions(200, 200);

    const { container } = renderPage();

    const file = new File(["small-image"], "small-logo.png", {
      type: "image/png",
    });

    await selectLogo(container, file);

    expect(
      await screen.findByText(/Logo must be at least 300/i),
    ).toBeInTheDocument();
  });
});
