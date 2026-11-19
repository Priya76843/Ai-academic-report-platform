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

import { SourcesPage } from "./SourcesPage";
import { project } from "@/mocks/fixtures";
import { mockState } from "@/mocks/handlers";
import type { Source } from "@/lib/api/types";

const projectId = project.id;

function makeSource(
  status: Source["status"],
  overrides: Partial<Source> = {},
): Source {
  return {
    id: `source-${status.toLowerCase()}`,
    project_id: projectId,
    source_type: "PAPER",
    filename: "research-paper.pdf",
    url: null,
    label: null,
    mime_type: "application/pdf",
    size_bytes: 1024,
    status,
    error:
      status === "FAILED"
        ? {
            category: "EXTRACTION_FAILED",
            message: "The PDF could not be processed.",
          }
        : null,
    summary:
      status === "READY"
        ? {
            title: "Sample Research Paper",
            authors: ["A. Researcher"],
            year: 2024,
            page_count: 8,
            passage_count: 24,
            extraction_quality: "high",
          }
        : null,
    citation_key: "SRC-001",
    created_at: "2026-11-13T10:00:00.000Z",
    ...overrides,
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[`/projects/${projectId}/sources`]}
      >
        <Routes>
          <Route
            path="/projects/:projectId/sources"
            element={<SourcesPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// Mock browser upload request for progress and cancellation tests.
class MockXMLHttpRequest {
  static instance: MockXMLHttpRequest;

  upload = {
    onprogress: null as
      | ((event: ProgressEvent) => void)
      | null,
  };

  status = 200;
  url = "";
  method = "";
  headers: Record<string, string> = {};

  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;

  open = vi.fn((method: string, url: string) => {
    this.method = method;
    this.url = url;
  });

  setRequestHeader = vi.fn((name: string, value: string) => {
    this.headers[name] = value;
  });

  send = vi.fn();

  constructor() {
    MockXMLHttpRequest.instance = this;
  }

  abort = vi.fn(() => {
    this.onabort?.();
  });
}

describe("SourcesPage", () => {
  beforeEach(() => {
    mockState.reset();
    mockState.setProjects([project]);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders the Sources & Evidence page", async () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: "Sources & Evidence" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "College format" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "Research papers" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "Source code" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { name: "Screenshots" }),
    ).toBeInTheDocument();

    expect(
      await screen.findByText("No sources added yet"),
    ).toBeInTheDocument();
  });

  it("displays all seven backend source statuses", async () => {
    const statuses: Source["status"][] = [
      "UPLOAD_PENDING",
      "UPLOADED",
      "PROCESSING",
      "READY",
      "FAILED",
      "RESOLVING",
      "NEEDS_UPLOAD",
    ];

    mockState.setSources(
      statuses.map((status) => makeSource(status)),
    );

    renderPage();

    for (const label of [
      "Upload pending",
      "Uploaded",
      "Processing",
      "Ready",
      "Failed",
      "Resolving link",
      "PDF required",
    ]) {
      expect(await screen.findByText(label)).toBeInTheDocument();
    }
  });

  it("shows the processed paper title, page count and passage count", async () => {
    mockState.setSources([makeSource("READY")]);

    renderPage();

    expect(
      await screen.findByText("Sample Research Paper"),
    ).toBeInTheDocument();

    expect(screen.getByText(/Pages:/)).toBeInTheDocument();
    expect(screen.getByText(/Passages:/)).toBeInTheDocument();
    expect(screen.getByText(/Pages:\s*8/)).toBeInTheDocument();
    expect(screen.getByText(/Passages:\s*24/)).toBeInTheDocument();
  });

  it("shows the failure category and processing error", async () => {
    mockState.setSources([makeSource("FAILED")]);

    renderPage();

    expect(
      await screen.findByText("EXTRACTION_FAILED"),
    ).toBeInTheDocument();

    expect(
      screen.getByText("The PDF could not be processed."),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Remove this source, then upload the PDF again/),
    ).toBeInTheDocument();
  });

  it("shows the incomplete-upload message", async () => {
    mockState.setSources([makeSource("UPLOAD_PENDING")]);

    renderPage();

    expect(
      await screen.findByText(
        /Upload was not completed\. Remove this entry if necessary and upload the PDF again\./,
      ),
    ).toBeInTheDocument();
  });

  it("loads the template library and selects a template", async () => {
    renderPage();

    fireEvent.click(
      screen.getByRole("button", { name: "Choose template" }),
    );

    const selectButton = await screen.findByRole("button", {
      name: "Select template",
    });

    fireEvent.click(selectButton);

    expect(
      await screen.findByRole("status"),
    ).toHaveTextContent("College format selected successfully.");

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Choose template" }),
      ).toBeInTheDocument();
    });
  });

  it("rejects a file that is not a PDF", async () => {
    renderPage();

    const file = new File(["not a pdf"], "notes.txt", {
      type: "text/plain",
    });

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    fireEvent.change(input, {
      target: { files: [file] },
    });

    expect(
      await screen.findByRole("status"),
    ).toHaveTextContent("Please select a PDF file.");
  });

  it("rejects a PDF larger than 25 MB", async () => {
    renderPage();

    const file = new File(
      [new Uint8Array(25 * 1024 * 1024 + 1)],
      "large-paper.pdf",
      { type: "application/pdf" },
    );

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    fireEvent.change(input, {
      target: { files: [file] },
    });

    expect(
      await screen.findByRole("status"),
    ).toHaveTextContent("The PDF must be 25 MB or smaller.");
  });

  it("displays real upload progress", async () => {
    vi.stubGlobal(
      "XMLHttpRequest",
      MockXMLHttpRequest as unknown as typeof XMLHttpRequest,
    );

    renderPage();

    const file = new File(
      ["sample PDF content"],
      "research-paper.pdf",
      { type: "application/pdf" },
    );

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    fireEvent.change(input, {
      target: { files: [file] },
    });

    expect(
      await screen.findByText("Uploading: 0%"),
    ).toBeInTheDocument();

    const progressEvent = {
      lengthComputable: true,
      loaded: 50,
      total: 100,
    } as ProgressEvent;

    act(() => {
      MockXMLHttpRequest.instance.upload.onprogress?.(progressEvent);
    });

    expect(
      await screen.findByText("Uploading: 50%"),
    ).toBeInTheDocument();
  });

  it(
    "marks a successfully uploaded PDF as READY after processing",
    async () => {
      vi.stubGlobal(
        "XMLHttpRequest",
        MockXMLHttpRequest as unknown as typeof XMLHttpRequest,
      );

      renderPage();

      const fileContent = "sample PDF content";

      const file = new File(
        [fileContent],
        "research-paper.pdf",
        { type: "application/pdf" },
      );

      const input = document.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

      fireEvent.change(input, {
        target: { files: [file] },
      });

      expect(
        await screen.findByText("Uploading: 0%"),
      ).toBeInTheDocument();

      await act(async () => {
        const xhr = MockXMLHttpRequest.instance;

        // Execute the actual MSW presigned-upload handler.
        const response = await fetch(xhr.url, {
          method: xhr.method,
          headers: xhr.headers,
          body: new TextEncoder().encode(fileContent),
        });

        expect(response.status).toBe(200);

        // Notify the component that the upload request succeeded.
        xhr.status = response.status;
        xhr.onload?.();
      });

      // Wait for the processing job and READY source status.
      expect(
        await screen.findByText(
          "Ready",
          {},
          { timeout: 12000 },
        ),
      ).toBeInTheDocument();
    },
    15000,
  );

  it("cancels an active PDF upload", async () => {
    vi.stubGlobal(
      "XMLHttpRequest",
      MockXMLHttpRequest as unknown as typeof XMLHttpRequest,
    );

    renderPage();

    const file = new File(
      ["sample PDF content"],
      "research-paper.pdf",
      { type: "application/pdf" },
    );

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    fireEvent.change(input, {
      target: { files: [file] },
    });

    expect(
      await screen.findByText("Uploading: 0%"),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Cancel upload" }),
    );

    expect(
      MockXMLHttpRequest.instance.abort,
    ).toHaveBeenCalled();

    expect(
      await screen.findByText("Upload cancelled."),
    ).toBeInTheDocument();
  });

  it("removes a source after confirmation", async () => {
    mockState.setSources([makeSource("READY")]);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderPage();

    expect(
      await screen.findByText("research-paper.pdf"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(
      await screen.findByRole("status"),
    ).toHaveTextContent("Source removed.");

    await waitFor(() => {
      expect(
        screen.queryByText("research-paper.pdf"),
      ).not.toBeInTheDocument();
    });
  });

  it("does not remove a source when confirmation is cancelled", async () => {
    mockState.setSources([makeSource("READY")]);
    vi.spyOn(window, "confirm").mockReturnValue(false);

    renderPage();

    expect(
      await screen.findByText("research-paper.pdf"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(
      screen.getByText("research-paper.pdf"),
    ).toBeInTheDocument();
  });

  it("keeps Continue to plan disabled when the college format is not ready", async () => {
    renderPage();

    const continueButton = await screen.findByRole("button", {
      name: "Continue to plan",
    });

    expect(continueButton).toBeDisabled();
  });
});
