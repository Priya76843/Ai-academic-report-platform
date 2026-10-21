
import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "@/mocks/server";
import { mockState } from "@/mocks/handlers";

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
  mockState.signIn();
  mockState.resetJob();
  mockState.resetProjects();
});

afterAll(() => {
  server.close();
});
