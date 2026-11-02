import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { queries } from "@/lib/api/queries";
import { ApiError } from "@/lib/api/client";

export function RequireAuth() {
  const location = useLocation();
  const meQuery = useQuery(queries.me());

  if (meQuery.isPending) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <p role="status" className="text-sm text-ink-2">
          Checking your session...
        </p>
      </div>
    );
  }

  if (
    meQuery.isError &&
    meQuery.error instanceof ApiError &&
    meQuery.error.status === 401
  ) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  if (meQuery.isError) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas p-6">
        <div role="alert" className="max-w-md text-center">
          <h1 className="text-lg font-semibold">Unable to verify your session</h1>
          <p className="mt-2 text-sm text-ink-2">
            Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={() => void meQuery.refetch()}
            className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
