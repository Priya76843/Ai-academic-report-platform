import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { SignInPage } from "./SignInPage";
import { server } from "@/mocks/server";

const API = "/api/v1";

function renderSignIn(
  mode: "signin" | "register" = "signin",
  initialEntry:
    | string
    | {
        pathname: string;
        state?: unknown;
      } = mode === "register" ? "/register" : "/login",
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="/login"
            element={<SignInPage mode="signin" />}
          />
          <Route
            path="/register"
            element={<SignInPage mode="register" />}
          />
          <Route
            path="/projects"
            element={<p>Projects page reached</p>}
          />
          <Route
            path="/projects/new"
            element={<p>New project page reached</p>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function fillCredentials(email: string, password: string) {
  fireEvent.change(screen.getByLabelText(/email address/i), {
    target: { value: email },
  });

  fireEvent.change(screen.getByLabelText(/^password$/i), {
    target: { value: password },
  });
}

function submitForm() {
  fireEvent.click(
    screen.getByRole("button", {
      name: /sign in|create account/i,
    }),
  );
}

describe("F-03 authentication", () => {
  it("shows a generic error for invalid credentials", async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json(
          {
            error: {
              code: "INVALID_CREDENTIALS",
              message: "Invalid email or password.",
              details: {},
            },
            request_id: "test-login-1",
          },
          { status: 401 },
        ),
      ),
    );

    renderSignIn();
    fillCredentials("student@example.com", "wrong-password");
    submitForm();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid email or password.",
    );

    expect(
      screen.queryByText(/email does not exist/i),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByText(/incorrect password/i),
    ).not.toBeInTheDocument();
  });

  it("shows a sign-in link when registration returns EMAIL_TAKEN", async () => {
    server.use(
      http.post(`${API}/auth/register`, () =>
        HttpResponse.json(
          {
            error: {
              code: "EMAIL_TAKEN",
              message: "An account with this email already exists.",
              details: {},
            },
            request_id: "test-register-1",
          },
          { status: 409 },
        ),
      ),
    );

    renderSignIn("register");
    fillCredentials("existing@example.com", "longpassword123");
    submitForm();

    expect(
      await screen.findByText(
        "An account with this email already exists.",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: /sign in instead/i }),
    ).toHaveAttribute("href", "/login");
  });

  it("shows rate-limit feedback from the API", async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json(
          {
            error: {
              code: "RATE_LIMITED",
              message: "Too many attempts.",
              details: {},
            },
            request_id: "test-login-2",
          },
          { status: 429 },
        ),
      ),
    );

    renderSignIn();
    fillCredentials("student@example.com", "some-password");
    submitForm();

    expect(
      await screen.findByText(
        "Too many attempts. Please wait before trying again.",
      ),
    ).toBeInTheDocument();
  });

  it("maps 422 field errors to the corresponding inputs", async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Please check your login details.",
              details: {
                fields: {
                  email: "Email format is invalid.",
                  password: "Password is required.",
                },
              },
            },
            request_id: "test-login-3",
          },
          { status: 422 },
        ),
      ),
    );

    renderSignIn();
    fillCredentials("student@example.com", "some-password");
    submitForm();

    expect(
      await screen.findByText("Email format is invalid."),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Password is required."),
    ).toBeInTheDocument();
  });

  it("returns to the originally requested page after successful login", async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json({
          id: "test-user",
          email: "student@example.com",
          created_at: "2026-10-01T00:00:00Z",
        }),
      ),
    );

    renderSignIn("signin", {
      pathname: "/login",
      state: {
        from: { pathname: "/projects/new" },
      },
    });

    fillCredentials("student@example.com", "some-password");
    submitForm();

    await waitFor(() => {
      expect(
        screen.getByText("New project page reached"),
      ).toBeInTheDocument();
    });
  });

  it("redirects to projects after successful registration", async () => {
    server.use(
      http.post(`${API}/auth/register`, () =>
        HttpResponse.json(
          {
            id: "new-user",
            email: "newstudent@example.com",
            created_at: "2026-10-27T00:00:00Z",
          },
          { status: 201 },
        ),
      ),
    );

    renderSignIn("register");
    fillCredentials("newstudent@example.com", "longpassword123");
    submitForm();

    expect(
      await screen.findByText("Projects page reached"),
    ).toBeInTheDocument();
  });
});
