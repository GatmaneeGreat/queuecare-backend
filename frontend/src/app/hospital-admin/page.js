
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function HospitalAdminDashboard() {
  const router = useRouter();

  const [dashboard, setDashboard] = useState(null);
  const [nurses, setNurses] = useState([]);
  const [nurseRequests, setNurseRequests] = useState([]);

  const [activeTab, setActiveTab] = useState("requests");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const getToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("queuecare_token");
  };

  const handleUnauthorized = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("queuecare_token");
    }
    router.replace("/login");
  };

  const apiFetch = async (path, options = {}) => {
    const token = getToken();

    if (!token) {
      handleUnauthorized();
      throw new Error("Please log in to continue.");
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body
          ? { "Content-Type": "application/json" }
          : {}),
        ...options.headers,
      },
      cache: "no-store",
    });

    if (response.status === 401) {
      handleUnauthorized();
      throw new Error("Your session has expired. Please log in again.");
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.detail || data.message || "Something went wrong."
      );
    }

    return data;
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      const [dashboardData, nursesData, requestsData] =
        await Promise.all([
          apiFetch("/hospital-admin/dashboard"),
          apiFetch("/hospital-admin/nurses"),
          apiFetch("/hospital-admin/nurse-requests"),
        ]);

      setDashboard(dashboardData);
      setNurses(Array.isArray(nursesData) ? nursesData : []);
      setNurseRequests(
        Array.isArray(requestsData) ? requestsData : []
      );
    } catch (err) {
      setError(err.message || "Unable to load hospital information.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleNurseDecision(nurseId, approvalStatus) {
    const action =
      approvalStatus === "approved" ? "approve" : "reject";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} this nurse request?`
    );

    if (!confirmed) return;

    setUpdatingId(nurseId);
    setError("");
    setSuccess("");

    try {
      await apiFetch(
        `/hospital-admin/nurse-requests/${nurseId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            approval_status: approvalStatus,
          }),
        }
      );

      setSuccess(
        `Nurse request ${approvalStatus} successfully.`
      );

      await loadData();
    } catch (err) {
      setError(err.message || "Unable to update nurse request.");
    } finally {
      setUpdatingId(null);
    }
  }

  function openPricingPage() {
    router.push("/pricing");
  }

  if (loading && !dashboard) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <p className="font-medium text-slate-600">
            Loading hospital dashboard...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">
              QueueCare
            </p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
              Hospital Admin Dashboard
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Manage your hospital, nurses, and subscription package.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50"
            >
              Refresh
            </button>

            <button
              onClick={() => router.push("/")}
              className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Home
            </button>
          </div>
        </header>

        {/* Error and success messages */}
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
          >
            {success}
          </div>
        )}

        {/* Hospital information */}
        <section className="mb-7 rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-600 p-6 text-white shadow-sm">
          <p className="text-sm text-emerald-100">
            Hospital
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">
                {dashboard?.hospital_name || "Your Hospital"}
              </h2>

              <p className="mt-2 text-sm text-emerald-100">
                Hospital ID: {dashboard?.hospital_id ?? "-"}
              </p>
            </div>

            <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
              {dashboard?.subscription_status || "active"}
            </span>
          </div>
        </section>

        {/* Dashboard statistics */}
        <section className="mb-7">
          <h2 className="mb-4 text-lg font-bold">
            Hospital Overview
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Nurses"
              value={dashboard?.total_nurses ?? 0}
              description="All registered nurses"
              icon="👩‍⚕️"
            />

            <StatCard
              title="Approved Nurses"
              value={dashboard?.approved_nurses ?? 0}
              description="Approved to use the system"
              icon="✓"
            />

            <StatCard
              title="Pending Requests"
              value={dashboard?.pending_nurses ?? 0}
              description="Waiting for your review"
              icon="⏳"
            />

            <StatCard
              title="Total Services"
              value={dashboard?.total_services ?? 0}
              description="Hospital departments or services"
              icon="🏥"
            />
          </div>
        </section>

        {/* Subscription package */}
        <section className="mb-8 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Hospital Subscription
              </p>

              <h2 className="mt-2 text-xl font-bold">
                Current Package:{" "}
                {(dashboard?.package || "free").toUpperCase()}
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Manage your hospital&apos;s QueueCare package.
              </p>

              {dashboard?.subscription_expires_at && (
                <p className="mt-2 text-sm text-slate-500">
                  Expires:{" "}
                  {new Date(
                    dashboard.subscription_expires_at
                  ).toLocaleDateString()}
                </p>
              )}

              <p className="mt-2 text-xs text-amber-700">
                Package changes are currently in demo mode. No real
                payment is processed.
              </p>
            </div>

            <button
              onClick={openPricingPage}
              className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white transition hover:bg-emerald-800"
            >
              Manage Package
            </button>
          </div>
        </section>

        {/* Nurse management */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5 sm:p-6">
            <h2 className="text-xl font-bold">
              Nurse Management
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Review registration requests and view nurses assigned
              to your hospital.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <TabButton
                active={activeTab === "requests"}
                onClick={() => setActiveTab("requests")}
              >
                Pending Requests ({nurseRequests.length})
              </TabButton>

              <TabButton
                active={activeTab === "nurses"}
                onClick={() => setActiveTab("nurses")}
              >
                All Nurses ({nurses.length})
              </TabButton>
            </div>
          </div>

          {/* Pending requests */}
          {activeTab === "requests" && (
            <div className="p-5 sm:p-6">
              {nurseRequests.length === 0 ? (
                <EmptyState message="There are no pending nurse requests." />
              ) : (
                <div className="space-y-4">
                  {nurseRequests.map((nurse) => (
                    <article
                      key={nurse.id}
                      className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0">
                        <h3 className="font-bold">
                          {nurse.name || "Unnamed Nurse"}
                        </h3>

                        <p className="mt-1 break-all text-sm text-slate-500">
                          {nurse.email}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          Position: {nurse.position || "Not specified"}
                        </p>

                        <span className="mt-2 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                          Pending
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          disabled={updatingId === nurse.id}
                          onClick={() =>
                            handleNurseDecision(
                              nurse.id,
                              "approved"
                            )
                          }
                          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                        >
                          {updatingId === nurse.id
                            ? "Updating..."
                            : "Approve"}
                        </button>

                        <button
                          disabled={updatingId === nurse.id}
                          onClick={() =>
                            handleNurseDecision(
                              nurse.id,
                              "rejected"
                            )
                          }
                          className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* All nurses */}
          {activeTab === "nurses" && (
            <div className="p-5 sm:p-6">
              {nurses.length === 0 ? (
                <EmptyState message="No nurses have registered for this hospital yet." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                        <th className="px-4 py-3 font-semibold">Name</th>
                        <th className="px-4 py-3 font-semibold">Email</th>
                        <th className="px-4 py-3 font-semibold">Position</th>
                        <th className="px-4 py-3 font-semibold">Service</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {nurses.map((nurse) => (
                        <tr
                          key={nurse.id}
                          className="border-b border-slate-100 last:border-0"
                        >
                          <td className="px-4 py-4 font-medium">
                            {nurse.name || "-"}
                          </td>

                          <td className="px-4 py-4 text-slate-600">
                            {nurse.email || "-"}
                          </td>

                          <td className="px-4 py-4">
                            {nurse.position || "-"}
                          </td>

                          <td className="px-4 py-4">
                            {nurse.service_name || "-"}
                          </td>

                          <td className="px-4 py-4">
                            <StatusBadge
                              status={nurse.approval_status}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>

        <footer className="py-7 text-center text-xs text-slate-400">
          QueueCare Hospital Administration
        </footer>
      </div>
    </main>
  );
}

function StatCard({ title, value, description, icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-800">
            {value}
          </p>
        </div>

        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl text-emerald-700">
          {icon}
        </span>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-emerald-700 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({ message }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 px-5 py-10 text-center">
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const normalizedStatus = String(status || "unknown").toLowerCase();

  const styles = {
    approved: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    rejected: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        styles[normalizedStatus] || "bg-slate-100 text-slate-600"
      }`}
    >
      {normalizedStatus.charAt(0).toUpperCase() +
        normalizedStatus.slice(1)}
    </span>
  );
}
