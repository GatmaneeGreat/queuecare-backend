
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const packages = [
  {
    name: "Free",
    price: 0,
    priceLabel: "฿0",
    period: "Free forever",
    description: "Basic package for hospital queue management.",
    features: [
      "Access to the QueueCare system",
      "Register patient queues",
      "View current and previous queues",
      "View package information",
    ],
  },
  {
    name: "Pro",
    price: 799,
    priceLabel: "฿799",
    period: "per month",
    description: "Advanced package for hospitals.",
    features: [
      "Includes all Free package features",
      "Additional subscription features",
      "Subscription review by System Admin",
      "Pro access after payment approval",
    ],
  },
];

export default function HospitalAdminPackagesPage() {
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const token = localStorage.getItem("queuecare_token");

      if (!token) {
        router.replace("/login");
        return;
      }

      if (!API_URL) {
        setError("Backend URL is not configured.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        if (response.status === 401) {
          localStorage.removeItem("queuecare_token");
          router.replace("/login");
          return;
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error("Unable to load your profile.");
        }

        if (data.role !== "hospital_admin") {
          if (data.role === "nurse") {
            router.replace("/nurse");
          } else if (data.role === "admin") {
            router.replace("/admin");
          } else {
            router.replace("/login");
          }
          return;
        }

        setProfile(data);
      } catch (err) {
        setError(err.message || "Unable to connect to the server.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f0f7f5]">
        <p className="text-[#087f72]">Loading packages...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f0f7f5] p-6">
        <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-800">
            Unable to Load Packages
          </h1>

          <p className="mt-3 text-sm text-red-600">{error}</p>

          <button
            onClick={() => router.push("/hospital-admin")}
            className="mt-5 rounded-xl bg-[#087f72] px-5 py-3 font-semibold text-white hover:bg-[#06665c]"
          >
            Back to Dashboard
          </button>
        </section>
      </main>
    );
  }

  if (!profile) return null;

  const currentPackage =
    String(profile.package || "").toLowerCase() === "pro"
      ? "Pro"
      : String(profile.package || "").toLowerCase() === "free"
        ? "Free"
        : "Not Assigned";

  const subscriptionStatus = profile.subscription_status
    ? String(profile.subscription_status)
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
    : "Unknown";

  return (
    <main className="min-h-screen bg-[#f0f7f5] text-slate-800">
      <header className="border-b border-[#dcebe7] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5">
          <div>
            <h1 className="text-2xl font-bold text-[#087f72]">
              QueueCare
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Hospital Admin · Package Management
            </p>
          </div>

          <button
            onClick={() => router.push("/hospital-admin")}
            className="rounded-xl border border-[#b8dcd3] px-5 py-3 font-semibold text-[#087f72] transition hover:bg-[#edf8f5]"
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10">
        <section className="mb-8">
          <p className="font-semibold text-[#087f72]">
            HOSPITAL SUBSCRIPTION
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            Choose Your Package
          </h2>

          <p className="mt-3 leading-7 text-slate-600">
            Compare the available packages and select Pro if your
            hospital needs additional subscription features.
          </p>

          <div className="mt-5 rounded-2xl border border-[#dcebe7] bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Your Current Package
            </p>

            <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xl font-bold text-[#087f72]">
                {currentPackage}
              </p>

              <span className="rounded-full bg-[#edf8f5] px-3 py-1 text-sm font-medium text-[#087f72]">
                {subscriptionStatus}
              </span>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          {packages.map((item) => {
            const isCurrent = currentPackage === item.name;
            const isPro = item.name === "Pro";

            return (
              <article
                key={item.name}
                className={`flex flex-col rounded-2xl border bg-white p-7 shadow-sm ${
                  isCurrent
                    ? "border-[#087f72] ring-2 ring-[#087f72]/10"
                    : "border-[#dcebe7]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-2xl font-bold">{item.name}</h3>

                  {isCurrent && (
                    <span className="rounded-full bg-[#dff4ed] px-3 py-1 text-xs font-bold text-[#087f72]">
                      Current Package
                    </span>
                  )}
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {item.description}
                </p>

                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-[#087f72]">
                    {item.priceLabel}
                  </span>

                  <span className="text-sm text-slate-500">
                    {item.period}
                  </span>
                </div>

                <div className="my-6 border-t border-slate-100" />

                <h4 className="font-semibold">Package Features</h4>

                <ul className="mt-4 flex-1 space-y-3">
                  {item.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex gap-3 text-sm leading-6 text-slate-600"
                    >
                      <span className="font-bold text-[#087f72]">
                        ✓
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-7">
                  {isPro ? (
                    <button
                      onClick={() =>
                        router.push("/hospital-admin/checkout")
                      }
                      disabled={currentPackage === "Pro"}
                      className="w-full rounded-xl bg-[#087f72] px-5 py-3 font-semibold text-white transition hover:bg-[#06665c] disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {currentPackage === "Pro"
                        ? "Already Subscribed"
                        : "Apply for Pro"}
                    </button>
                  ) : (
                    <div className="rounded-xl bg-slate-50 px-5 py-3 text-center text-sm font-medium text-slate-500">
                      {isCurrent ? "Your Current Plan" : "Free Package"}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </section>

        <p className="mt-6 text-center text-sm leading-6 text-slate-500">
          Pro costs ฿799 per month. Your Pro subscription will become
          active after payment verification and approval.
        </p>

        <footer className="py-8 text-center text-xs text-slate-400">
          QueueCare © 2026
        </footer>
      </div>
    </main>
  );
}
