import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, beforeEach } from "vitest";
import { RequireAuth } from "./RequireAuth";
import { mockState } from "@/mocks/handlers";

function LoginPage() {
  const location = useLocation();
  const from = location.state?.from;

  return (
    <div>
      <h1>Login page reached</h1>
      <p data-testid="redirect-path">{from?.pathname}</p>
    </div>
  );
}

function renderProtectedRoute(path = "/projects") {
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
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route
              path="/projects"
              element={<h1>Protected projects page</h1>}
            />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockState.reset();
  mockState.signOut();
});

describe("F-03 RequireAuth", () => {
  it("redirects unauthenticated users to login and preserves the requested path", async () => {
    renderProtectedRoute("/projects");

    expect(
      await screen.findByRole("heading", { name: "Login page reached" }),
    ).toBeInTheDocument();

    expect(screen.getByTestId("redirect-path")).toHaveTextContent("/projects");

    expect(
      screen.queryByRole("heading", { name: "Protected projects page" }),
    ).not.toBeInTheDocument();
  });
});
