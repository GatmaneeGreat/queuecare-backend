
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const PACKAGES = [
  {
    id: "free",
    name: "Free",
    price: "฿0",
    billing: "per month",
    description:
      "A basic package for hospitals getting started with QueueCare.",
    features: [
      "Basic hospital queue management",
      "Patient queue status monitoring",
      "Nurse management",
      "Hospital dashboard",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "฿676,767",
    billing: "per month (planned)",
    description:
      "A Pro package for hospitals that want to explore additional features.",
    features: [
      "All basic QueueCare features",
      "Pro package status",
      "Hospital subscription management",
      "Package switching through the dashboard",
    ],
  },
];

export default function PricingPage() {
  const router = useRouter();

  const [currentPackage, setCurrentPackage] = useState(null);
  const [hospitalName, setHospitalName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadPackage = useCallback(async () => {
    const token = localStorage.getItem("queuecare_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/hospital-admin/subscription/package`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      if (response.status === 401) {
        localStorage.removeItem("queuecare_token");
        router.replace("/login");
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to load package information."
        );
      }

      setCurrentPackage(
        String(data.package || "free").toLowerCase()
      );
      setHospitalName(data.hospital_name || "");
    } catch (err) {
      setError(
        err.message || "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadPackage();
  }, [loadPackage]);

  async function changePackage(packageId) {
    if (saving || packageId === currentPackage) {
      return;
    }

    const packageName =
      packageId.charAt(0).toUpperCase() + packageId.slice(1);

    const confirmed = window.confirm(
      `Are you sure you want to switch to the ${packageName} package?\n\n` +
        "This is a demonstration feature. No real payment will be processed."
    );

    if (!confirmed) return;

    const token = localStorage.getItem("queuecare_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const response = await fetch(
        `${API_URL}/hospital-admin/subscription/package`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            package: packageId,
          }),
        }
      );

      if (response.status === 401) {
        localStorage.removeItem("queuecare_token");
        router.replace("/login");
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to change the package."
        );
      }

      setCurrentPackage(
        String(data.package || packageId).toLowerCase()
      );

      setMessage(
        `Your package has been successfully changed to ${packageName}.`
      );
    } catch (err) {
      setError(
        err.message || "Unable to change the package."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f0f7f5] px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-emerald-700 border-t-transparent" />
          <p className="font-medium text-slate-600">
            Loading subscription packages...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f0f7f5] px-5 py-10 text-slate-800">
      <div className="mx-auto max-w-5xl">
        {/* Navigation */}
        <button
          type="button"
          onClick={() => router.push("/hospital-admin")}
          className="mb-7 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
        >
          &larr; Back to Hospital Admin
        </button>

        {/* Page Header */}
        <header className="mb-9 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">
            QueueCare Subscription
          </p>

          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
            Choose Your Package
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Select the subscription package that best suits your
            hospital&apos;s needs.
          </p>

          {hospitalName && (
            <p className="mt-3 text-sm font-medium text-slate-700">
              Hospital: {hospitalName}
            </p>
          )}

          <div className="mx-auto mt-5 max-w-2xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <strong>Demo Mode:</strong> Package changes take effect
            immediately. No real payment will be processed.
          </div>
        </header>

        {/* Error Message */}
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <p className="font-semibold">Error</p>
            <p className="mt-1">{error}</p>

            <button
              type="button"
              onClick={loadPackage}
              className="mt-3 font-semibold underline"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Success Message */}
        {message && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <p className="font-semibold">Success</p>
            <p className="mt-1">{message}</p>
          </div>
        )}

        {/* Package Cards */}
        <div className="grid items-stretch gap-6 md:grid-cols-2">
          {PACKAGES.map((plan) => {
            const isCurrent = currentPackage === plan.id;

            return (
              <section
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition ${
                  isCurrent
                    ? "border-emerald-600 ring-2 ring-emerald-600/15"
                    : "border-slate-200 hover:border-emerald-300"
                }`}
              >
                {/* Package Name */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-2xl font-bold">
                    {plan.name}
                  </h2>

                  {isCurrent && (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                      CURRENT PACKAGE
                    </span>
                  )}
                </div>

                {/* Package Price */}
                <div className="mt-5">
                  <span className="text-4xl font-bold text-emerald-700">
                    {plan.price}
                  </span>

                  <span className="ml-2 text-sm text-slate-500">
                    {plan.billing}
                  </span>
                </div>

                {/* Package Description */}
                <p className="mt-4 min-h-[72px] text-sm leading-6 text-slate-600">
                  {plan.description}
                </p>

                <div className="my-5 border-t border-slate-100" />

                {/* Features */}
                <h3 className="mb-4 font-semibold">
                  What&apos;s Included
                </h3>

                <ul className="flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-sm leading-5 text-slate-700"
                    >
                      <span className="mt-0.5 font-bold text-emerald-700">
                        &#10003;
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Package Action */}
                <button
                  type="button"
                  disabled={saving || isCurrent}
                  onClick={() => changePackage(plan.id)}
                  className={`mt-8 w-full rounded-xl px-5 py-3 font-semibold transition ${
                    isCurrent
                      ? "cursor-not-allowed bg-slate-100 text-slate-500"
                      : "bg-emerald-700 text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                  }`}
                >
                  {saving
                    ? "Updating Package..."
                    : isCurrent
                      ? "Current Package"
                      : `Switch to ${plan.name}`}
                </button>
              </section>
            );
          })}
        </div>

        {/* Footer Notice */}
        <footer className="mt-9 space-y-2 text-center text-xs leading-5 text-slate-500">
          <p>
            Package changes are saved to your hospital account.
          </p>
          <p>
            Pro pricing is displayed for demonstration purposes.
            No payment is collected on this page.
          </p>
        </footer>
      </div>
    </main>
  );
}
