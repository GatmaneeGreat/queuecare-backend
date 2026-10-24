"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      // Step 1: Login with FastAPI
      const formData = new URLSearchParams();
      formData.append("username", email.trim().toLowerCase());
      formData.append("password", password);

      const loginResponse = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const loginData = await loginResponse.json().catch(() => ({}));

      if (!loginResponse.ok) {
        throw new Error(
          loginData.detail || "Unable to log in. Please try again."
        );
      }

      if (!loginData.access_token) {
        throw new Error("The server did not return an access token.");
      }

      // Step 2: Save JWT
      localStorage.setItem("queuecare_token", loginData.access_token);

      // Step 3: Get current user profile
      const profileResponse = await fetch(`${API_URL}/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${loginData.access_token}`,
        },
      });

      const profileData = await profileResponse.json().catch(() => ({}));

      if (!profileResponse.ok) {
        localStorage.removeItem("queuecare_token");
        throw new Error(
          profileData.detail || "Unable to load your account information."
        );
      }

      // Step 4: Redirect according to user role
      if (profileData.role === "admin") {
        router.push("/admin");
      } else if (profileData.role === "hospital_admin") {
        router.push("/hospital-admin");
      } else if (profileData.role === "nurse") {
        if (
          profileData.approval_status &&
          profileData.approval_status !== "approved"
        ) {
          localStorage.removeItem("queuecare_token");
          throw new Error(
            "Your account is awaiting administrator approval."
          );
        }

        router.push("/nurse");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError(
        err.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo and Heading */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#087f72] text-3xl font-bold text-white shadow-lg">
              Q
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              QueueCare
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Hospital Queue Management System
            </p>
          </div>

          {/* Login Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">
                  Staff Login
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Sign in to access your account.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Email Address
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#087f72] focus:ring-2 focus:ring-[#087f72]/20"
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Password
                </label>

                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-20 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#087f72] focus:ring-2 focus:ring-[#087f72]/20"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute inset-y-0 right-3 text-sm font-medium text-[#087f72] hover:text-[#06665c]"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#087f72] px-4 py-3 font-semibold text-white transition hover:bg-[#06665c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            {/* Sign Up Link */}
            <div className="mt-5 text-center text-sm text-slate-500">
              Hospital staff member?{" "}
              <button
                type="button"
                onClick={() => router.push("/signup")}
                className="font-semibold text-[#087f72] hover:underline"
              >
                Create an Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-4 py-5 text-center text-xs text-slate-400">
        <p>Authorized hospital staff only.</p>
        <p className="mt-1">QueueCare © 2026</p>
      </footer>
    </main>
  );
}