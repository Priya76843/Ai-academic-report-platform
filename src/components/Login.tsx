import { useState } from "react";
export default function Login() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-[#F7FAFF] flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#2563EB] text-white font-bold text-xl mb-4 shadow-sm">
            AI
          </div>

          <h1 className="text-3xl font-semibold text-[#0F172A]">
            Academic Workspace
          </h1>

          <p className="text-[#64748B] mt-2">
            Create, review and generate your academic reports
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-7 shadow-[0_10px_35px_rgba(15,23,42,0.08)]">
          <h2 className="text-xl font-semibold text-[#0F172A] mb-1">
            Welcome back
          </h2>

          <p className="text-sm text-[#64748B] mb-6">
            Sign in to continue to your workspace
          </p>

          {/* Email */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-[#334155] mb-2">
              Email
            </label>

            <input
              type="email"
              placeholder="you@example.com"
              className="w-full bg-white border border-[#CBD5E1] rounded-lg px-4 py-3 text-[#0F172A] placeholder-[#94A3B8] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Password */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-[#334155]">
                Password
              </label>

              <button
                type="button"
                className="text-sm text-[#2563EB] hover:text-[#1D4ED8] hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className="w-full bg-white border border-[#CBD5E1] rounded-lg px-4 py-3 pr-16 text-[#0F172A] placeholder-[#94A3B8] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#64748B] hover:text-[#2563EB]"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Login */}
          <button className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold py-3 rounded-lg transition shadow-sm">
            Sign in
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="h-px bg-[#E2E8F0] flex-1" />

            <span className="text-xs text-[#94A3B8]">
              OR
            </span>

            <div className="h-px bg-[#E2E8F0] flex-1" />
          </div>

          {/* Google */}
          <button className="w-full border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#334155] font-medium py-3 rounded-lg transition">
            Continue with Google
          </button>

          {/* Create Account */}
          <p className="text-center text-sm text-[#64748B] mt-6">
            Don't have an account?{" "}
            <button className="text-[#2563EB] font-medium hover:text-[#1D4ED8] hover:underline">
              Create account
            </button>
          </p>
        </div>

        <p className="text-center text-xs text-[#94A3B8] mt-6">
          AI Academic Workspace
        </p>
      </div>
    </div>
  );
}

