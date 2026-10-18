
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function SignUpPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hospitalId, setHospitalId] = useState("");

  const [hospitals, setHospitals] = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchHospitals() {
      if (!API_URL) {
        setError("Backend URL is not configured.");
        setLoadingHospitals(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/hospitals`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            typeof data.detail === "string"
              ? data.detail
              : "Unable to load hospitals."
          );
        }

        setHospitals(data);
      } catch (err) {
        setError(err.message || "Unable to load hospitals.");
      } finally {
        setLoadingHospitals(false);
      }
    }

    fetchHospitals();
  }, []);

  async function handleSignUp(event) {
    event.preventDefault();
    setError("");
    setSuccess(false);

    if (!API_URL) {
      setError("Backend URL is not configured.");
      return;
    }

    if (!hospitalId) {
      setError("Please select your hospital.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          hospital_id: Number(hospitalId),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Unable to create your account."
        );
      }

      setSuccess(true);
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setHospitalId("");
    } catch (err) {
      setError(err.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f0f7f5] px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[#dcebe7] bg-white p-7 shadow-lg sm:p-9">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-[#176b5b]">
            QueueCare
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Smart Hospital Queue Management System
          </p>
        </header>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800">
            Create a Nurse Account
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Submit your details for approval by your hospital administrator.
          </p>
        </div>

        {success ? (
          <div
            role="status"
            className="rounded-xl border border-green-200 bg-green-50 p-5"
          >
            <h3 className="font-semibold text-green-800">
              Registration Submitted
            </h3>
            <p className="mt-2 text-sm text-green-700">
              Your registration is waiting for approval from your Hospital
              Admin. You can sign in after your account has been approved.
            </p>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="mt-5 w-full rounded-lg bg-[#176b5b] px-4 py-3 font-medium text-white hover:bg-[#125548]"
            >
              Go to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                autoComplete="name"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-[#176b5b] focus:ring-2 focus:ring-[#176b5b]/20"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-[#176b5b] focus:ring-2 focus:ring-[#176b5b]/20"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label
                htmlFor="hospital"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Hospital
              </label>
              <select
                id="hospital"
                value={hospitalId}
                onChange={(event) => setHospitalId(event.target.value)}
                required
                disabled={loadingHospitals || hospitals.length === 0}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 outline-none focus:border-[#176b5b] focus:ring-2 focus:ring-[#176b5b]/20 disabled:bg-gray-100"
              >
                <option value="">
                  {loadingHospitals
                    ? "Loading hospitals..."
                    : hospitals.length === 0
                    ? "No hospitals available"
                    : "Select your hospital"}
                </option>
                {hospitals.map((hospital) => (
                  <option key={hospital.id} value={hospital.id}>
                    {hospital.name}
                  </option>
                ))}
              </select>
              {!loadingHospitals && hospitals.length === 0 && (
                <p className="mt-1 text-xs text-amber-700">
                  No hospitals were found. Please contact the system
                  administrator.
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-[#176b5b] focus:ring-2 focus:ring-[#176b5b]/20"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                required
                maxLength={72}
                autoComplete="new-password"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-[#176b5b] focus:ring-2 focus:ring-[#176b5b]/20"
                placeholder="Enter your password again"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || loadingHospitals || hospitals.length === 0}
              className="w-full rounded-lg bg-[#176b5b] px-4 py-3 font-semibold text-white transition hover:bg-[#125548] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Submitting..." : "Submit Registration"}
            </button>
          </form>
        )}

        {!success && (
          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="font-semibold text-[#176b5b] hover:underline"
            >
              Sign In
            </button>
          </p>
        )}

        <footer className="mt-8 text-center text-xs text-gray-400">
          QueueCare © 2026
        </footer>
      </section>
    </main>
  );
}
