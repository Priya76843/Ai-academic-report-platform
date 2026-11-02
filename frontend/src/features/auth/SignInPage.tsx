import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ApiError, api } from "@/lib/api/client";
import type { User } from "@/lib/api/types";

const authSchema = (mode: "signin" | "register") =>
  z.object({
    email: z
      .string()
      .trim()
      .email("Enter a valid email address."),
    password: z.string().min(1, "Password is required.").superRefine(
      (password, ctx) => {
        if (mode === "register" && password.length < 10) {
          ctx.addIssue({
            code: "custom",
            message: "Password must be at least 10 characters.",
          });
        }

        if (mode === "register" && password.length > 128) {
          ctx.addIssue({
            code: "custom",
            message: "Password must be no more than 128 characters.",
          });
        }
      },
    ),
  });

type AuthValues = z.infer<ReturnType<typeof authSchema>>;

type RedirectState = {
  from?: {
    pathname?: unknown;
  };
};

function getRedirectPath(from: unknown): string {
  if (typeof from !== "string") {
    return "/projects";
  }

  if (
    !from.startsWith("/") ||
    from.startsWith("//") ||
    from === "/login" ||
    from === "/register"
  ) {
    return "/projects";
  }

  return from;
}

export function SignInPage({
  mode = "signin",
}: {
  mode?: "signin" | "register";
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const redirectState = location.state as RedirectState | null;
  const redirectTo = getRedirectPath(redirectState?.from?.pathname);

  const [formError, setFormError] = useState("");
  const [emailTaken, setEmailTaken] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === "register";

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<AuthValues>({
    resolver: zodResolver(authSchema(mode)),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: AuthValues) => {
    setFormError("");
    setEmailTaken(false);
    clearErrors();
    setSubmitting(true);

    try {
      const endpoint = isRegister
        ? "/auth/register"
        : "/auth/login";

      await api<User>(endpoint, {
        method: "POST",
        body: {
          email: values.email.trim().toLowerCase(),
          password: values.password,
        },
      });

      navigate(redirectTo, { replace: true });
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setFormError("Something went wrong. Please try again.");
        return;
      }

      if (error.code === "INVALID_CREDENTIALS") {
        setFormError("Invalid email or password.");
        return;
      }

      if (error.code === "EMAIL_TAKEN") {
        setEmailTaken(true);
        setFormError("An account with this email already exists.");
        return;
      }

      if (error.code === "RATE_LIMITED") {
        setFormError(
          "Too many attempts. Please wait before trying again.",
        );
        return;
      }

      if (error.status === 422) {
        let mapped = false;

        for (const field of ["email", "password"] as const) {
          if (error.fields[field]) {
            setError(field, {
              type: "server",
              message: error.fields[field],
            });
            mapped = true;
          }
        }

        if (!mapped) {
          setFormError(
            error.message || "Please check your details.",
          );
        }

        return;
      }

      setFormError(
        isRegister
          ? "Unable to create your account right now. Please try again."
          : "Unable to sign in right now. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4 py-10 text-ink">
      <section className="w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent font-doc text-xl text-white">
            A
          </span>

          <div>
            <h1 className="text-lg font-semibold">
              Documentation Platform
            </h1>
            <p className="text-sm text-ink-3">
              Your project workspace
            </p>
          </div>
        </div>

        <h2 className="text-2xl font-semibold">
          {isRegister ? "Create your account" : "Welcome back"}
        </h2>

        <p className="mt-2 text-sm text-ink-2">
          {isRegister
            ? "Register to start working on your project reports."
            : "Sign in to continue to your projects."}
        </p>

        <form
          className="mt-6 flex flex-col gap-5"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium"
            >
              Email address
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              {...register("email")}
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm outline-none focus:border-accent"
              placeholder="you@example.com"
            />

            {errors.email?.message && (
              <p
                id="email-error"
                role="alert"
                className="mt-1 text-sm text-red-600"
              >
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              autoComplete={
                isRegister ? "new-password" : "current-password"
              }
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password ? "password-error" : undefined
              }
              {...register("password")}
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm outline-none focus:border-accent"
              placeholder={
                isRegister
                  ? "At least 10 characters"
                  : "Enter your password"
              }
            />

            {errors.password?.message && (
              <p
                id="password-error"
                role="alert"
                className="mt-1 text-sm text-red-600"
              >
                {errors.password.message}
              </p>
            )}

            {isRegister && (
              <p className="mt-1 text-xs text-ink-3">
                Use between 10 and 128 characters.
              </p>
            )}
          </div>

          {formError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              <p>{formError}</p>

              {emailTaken && (
                <p className="mt-2">
                  <Link
                    to="/login"
                    state={location.state}
                    className="font-semibold underline"
                  >
                    Sign in instead
                  </Link>
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? isRegister
                ? "Creating account..."
                : "Signing in..."
              : isRegister
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-2">
          {isRegister
            ? "Already have an account? "
            : "Don't have an account? "}

          <Link
            to={isRegister ? "/login" : "/register"}
            state={location.state}
            className="font-semibold text-accent hover:underline"
          >
            {isRegister ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </section>
    </main>
  );
}
