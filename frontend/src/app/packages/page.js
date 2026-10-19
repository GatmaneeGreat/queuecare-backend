
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const packages = [
  {
    name: "Free",
    description: "Basic package",
    features: [
      "Access to the QueueCare system",
      "Register patient queues",
      "View current and previous queues",
      "View package information",
    ],
  },
  {
    name: "Pro",
    description: "Advanced package",
    features: [
      "Includes the Free package features",
      "Additional features depend on the hospital subscription",
    ],
  },
];

export default function PackagesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);

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

        if (data.role !== "nurse") {
          if (data.role === "admin") {
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
        <section className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="font-semibold text-red-600">{error}</p>
          <button
            onClick={() => router.push("/nurse")}
            className="mt-5 rounded-xl bg-[#087f72] px-5 py-3 font-semibold text-white"
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

  return (
    <main className="min-h-screen bg-[#f0f7f5] text-slate-800">
      <header className="border-b border-[#dcebe7] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5">
          <div>
            <h1 className="text-2xl font-bold text-[#087f72]">
              QueueCare
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Package Information
            </p>
          </div>

          <button
            onClick={() => router.push("/nurse")}
            className="rounded-xl border border-[#b8dcd3] px-5 py-3 font-semibold text-[#087f72] hover:bg-[#edf8f5]"
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10">
        <section className="mb-8">
          <p className="font-semibold text-[#087f72]">
            VIEW ONLY
          </p>
          <h2 className="mt-2 text-3xl font-bold">
            Free and Pro Packages
          </h2>
          <p className="mt-3 text-slate-600">
            You can view package information here. Package changes and
            payments are not available for nurse accounts.
          </p>
          <p className="mt-4 inline-flex rounded-full bg-[#dff4ed] px-4 py-2 text-sm font-semibold text-[#087f72]">
            Your current package: {currentPackage}
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          {packages.map((item) => (
            <article
              key={item.name}
              className={`rounded-2xl border bg-white p-7 shadow-sm ${
                currentPackage === item.name
                  ? "border-[#087f72] ring-2 ring-[#087f72]/10"
                  : "border-[#dcebe7]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-2xl font-bold">{item.name}</h3>
                {currentPackage === item.name && (
                  <span className="rounded-full bg-[#dff4ed] px-3 py-1 text-xs font-bold text-[#087f72]">
                    Current Package
                  </span>
                )}
              </div>

              <p className="mt-2 text-slate-500">
                {item.description}
              </p>

              <div className="my-6 border-t border-slate-100" />

              <h4 className="font-semibold">Package Information</h4>

              <ul className="mt-4 space-y-3">
                {item.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex gap-3 text-sm leading-6 text-slate-600"
                  >
                    <span className="font-bold text-[#087f72]">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-7 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                For package changes or subscription inquiries, please
                contact your hospital administrator.
              </div>
            </article>
          ))}
        </section>

        <footer className="py-8 text-center text-xs text-slate-400">
          QueueCare © 2026
        </footer>
      </div>
    </main>
  );
}
