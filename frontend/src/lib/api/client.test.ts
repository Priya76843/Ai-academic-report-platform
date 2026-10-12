import { describe, expect, it } from "vitest";
import { api, ApiError } from "./client";
import { mockState } from "@/mocks/handlers";
import type { User } from "./types";

describe("api client", () => {
  it("returns typed JSON on success", async () => {
    const me = await api<User>("/auth/me");
    expect(me.email).toBe("priya.s@college.example");
  });
  it("turns the error envelope into ApiError", async () => {
    mockState.signOut();
    const err = (await api("/auth/me").catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(401);
    expect(err.code).toBe("UNAUTHENTICATED");
    expect(err.requestId).toBeTruthy();
  });
  it("maps 404 for projects the user does not own", async () => {
    const err = (await api("/projects/not-mine").catch((e: unknown) => e)) as ApiError;
    expect(err.code).toBe("NOT_FOUND");
  });
});
