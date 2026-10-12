import { Link } from "react-router-dom";
import { Note } from "@/components/Note";

// F-03 implements the form, validation and error codes. This placeholder proves routing and layout.
export function SignInPage({ mode = "signin" }: { mode?: "signin" | "register" }) {
  return (
    <div className="grid min-h-full place-items-center bg-surface-2 p-6">
      <div className="w-full max-w-[400px] rounded-xl border border-line bg-surface p-6 shadow">
        <h1 className="text-xl font-semibold tracking-tight">{mode === "register" ? "Create your account" : "Welcome back"}</h1>
        <div className="mt-4"><Note>Sign-in form arrives with ticket F-03. Backend auth endpoints arrive with B-02.</Note></div>
        <p className="mt-4 text-[13px] text-ink-2">
          {mode === "register" ? <Link to="/login" className="text-accent">Sign in instead</Link> : <Link to="/register" className="text-accent">Create an account</Link>}
        </p>
      </div>
    </div>
  );
}
