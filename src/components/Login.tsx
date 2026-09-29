import { useState } from "react";
export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#FFB800] text-black font-bold text-xl mb-4">
            AI
          </div>
          <h1 className="text-3xl font-semibold text-white">
            Academic Workspace
          </h1>
          <p className="text-gray-400 mt-2">
            Create, review and generate your academic reports
          </p>
        </div>
        {/* Login Card */}
        <div className="bg-[#151515] border border-[#292929] rounded-2xl p-7 shadow-2xl">
          <h2 className="text-xl font-medium text-white mb-1">
            Welcome back
          </h2>
          <p className="text-sm text-gray-400 mb-6">
            Sign in to continue to your workspace
          </p>
          {/* Email */}
          <div className="mb-5">
            <label className="block text-sm text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full bg-[#0d0d0d] border border-[#303030] rounded-lg px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-[#FFB800]"
            />
          </div>
          {/* Password */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <label className="text-sm text-gray-300">
                Password
              </label>
              <button className="text-sm text-[#FFB800] hover:underline">
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className="w-full bg-[#0d0d0d] border border-[#303030] rounded-lg px-4 py-3 pr-16 text-white placeholder-gray-600 outline-none focus:border-[#FFB800]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 hover:text-white"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          {/* Login */}
          <button className="w-full bg-[#FFB800] hover:bg-[#ffc533] text-black font-semibold py-3 rounded-lg transition">
            Sign in
          </button>
          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="h-px bg-[#303030] flex-1" />
            <span className="text-xs text-gray-500">
              OR
            </span>
            <div className="h-px bg-[#303030] flex-1" />
          </div>
          {/* Google */}
          <button className="w-full border border-[#303030] hover:bg-[#202020] text-white py-3 rounded-lg transition">
            Continue with Google
          </button>
          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{" "}
            <button className="text-[#FFB800] hover:underline">
              Create account
            </button>
          </p>
        </div>
        <p className="text-center text-xs text-gray-600 mt-6">
          AI Academic Workspace
        </p>
      </div>
    </div>
  );
}

