
"use client";

import { useCallback, useEffect, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const EMPTY_STATS = {
  total_hospitals: 0,
  free_hospitals: 0,
  pro_hospitals: 0,
  total_nurses: 0,
};

async function fetchJSON(path, token) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      typeof data.detail === "string"
        ? data.detail
        : `Request failed (${response.status})`
    );
    error.status = response.status;
    throw error;
  }

  return data;
}

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.payments)) return data.payments;
  if (Array.isArray(data?.hospitals)) return data.hospitals;
  return [];
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(value) {
  return Number(value ?? 0).toLocaleString("en-US", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  });
}

function displayText(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [hospitals, setHospitals] = useState([]);
  const [payments, setPayments] = useState([]);

  const [hospitalSearch, setHospitalSearch] = useState("");
  const [paymentSearch, setPaymentSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [statsError, setStatsError] = useState("");
  const [hospitalsError, setHospitalsError] = useState("");
  const [paymentsError, setPaymentsError] = useState("");
  const [authError, setAuthError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setAuthError("");
    setStatsError("");
    setHospitalsError("");
    setPaymentsError("");

    const token = localStorage.getItem("queuecare_token");

    if (!token) {
      setAuthError("Please log in with your System Admin account.");
      setLoading(false);
      return;
    }

    const endpoints = [
      {
        path: "/admin/dashboard/stats",
        success: (data) => setStats({ ...EMPTY_STATS, ...data }),
        failure: setStatsError,
      },
      {
        path: "/admin/hospitals",
        success: (data) => setHospitals(normalizeList(data)),
        failure: setHospitalsError,
      },
      {
        path: "/admin/subscription-payments",
        success: (data) => setPayments(normalizeList(data)),
        failure: setPaymentsError,
      },
    ];

    const results = await Promise.allSettled(
      endpoints.map((endpoint) => fetchJSON(endpoint.path, token))
    );

    let sessionExpired = false;
    let accessDenied = false;

    results.forEach((result, index) => {
      const endpoint = endpoints[index];

      if (result.status === "fulfilled") {
        endpoint.success(result.value);
        return;
      }

      const errorMessage =
        result.reason?.message || "Unable to load data.";

      if (result.reason?.status === 401) sessionExpired = true;
      if (result.reason?.status === 403) accessDenied = true;

      endpoint.failure(`${endpoint.path}: ${errorMessage}`);
    });

    if (sessionExpired) {
      setAuthError("Your session has expired. Please log in again.");
    } else if (accessDenied) {
      setAuthError(
        "Access denied. This page is available to System Admin only."
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard, refreshKey]);

  const filteredHospitals = hospitals.filter((hospital) => {
    const keyword = hospitalSearch.toLowerCase();

    return [
      hospital.name,
      hospital.hospital_name,
      hospital.package,
      hospital.subscription_status,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword));
  });

  const filteredPayments = payments.filter((payment) => {
    const keyword = paymentSearch.toLowerCase();

    return [
      payment.hospital_name,
      payment.reference,
      payment.status,
      payment.package,
      payment.payment_method,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword));
  });

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800 md:p-8">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-teal-700">
              QueueCare
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              System Admin Dashboard
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Monitor hospital subscriptions and payment records.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setRefreshKey((value) => value + 1)}
            disabled={loading}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh Data"}
          </button>
        </header>

        {authError && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <p className="font-semibold">Authentication Error</p>
            <p className="mt-1">{authError}</p>
          </div>
        )}

        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold">Overview</h2>
            <p className="mt-1 text-sm text-slate-500">
              Summary of registered hospitals and nurse accounts.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Hospitals"
              value={stats.total_hospitals}
              description="Registered hospitals"
              symbol="H"
            />
            <StatCard
              title="Free Hospitals"
              value={stats.free_hospitals}
              description="Using the Free package"
              symbol="F"
            />
            <StatCard
              title="Pro Hospitals"
              value={stats.pro_hospitals}
              description="Using the Pro package"
              symbol="P"
            />
            <StatCard
              title="Nurse Accounts"
              value={stats.total_nurses}
              description="Registered nurse accounts"
              symbol="N"
            />
          </div>

          {statsError && <SectionError message={statsError} />}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:p-6">
            <div>
              <h2 className="text-xl font-bold">
                Hospital Subscriptions
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                View hospital packages, subscription status, and expiry dates.
              </p>
            </div>

            <input
              type="search"
              value={hospitalSearch}
              onChange={(event) => setHospitalSearch(event.target.value)}
              placeholder="Search hospitals..."
              aria-label="Search hospitals"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-600 md:max-w-xs"
            />
          </div>

          {hospitalsError ? (
            <SectionError message={hospitalsError} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Hospital</th>
                    <th className="px-5 py-4">Package</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Start Date</th>
                    <th className="px-5 py-4">Expiry Date</th>
                    <th className="px-5 py-4">Months Used</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loading && hospitals.length === 0 ? (
                    <EmptyRow colSpan={6} text="Loading hospitals..." />
                  ) : filteredHospitals.length === 0 ? (
                    <EmptyRow colSpan={6} text="No hospitals found." />
                  ) : (
                    filteredHospitals.map((hospital, index) => (
                      <tr
                        key={hospital.id ?? index}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 font-semibold text-slate-800">
                          {displayText(
                            hospital.name ?? hospital.hospital_name
                          )}
                          <p className="mt-1 text-xs font-normal text-slate-400">
                            ID: {displayText(
                              hospital.id ?? hospital.hospital_id
                            )}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <PackageBadge value={hospital.package} />
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            value={hospital.subscription_status}
                          />
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatDate(hospital.subscription_started_at)}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatDate(hospital.subscription_expires_at)}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {displayText(hospital.months_used)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            Showing {filteredHospitals.length} hospital(s)
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:p-6">
            <div>
              <h2 className="text-xl font-bold">Payment History</h2>
              <p className="mt-1 text-sm text-slate-500">
                View hospital subscription payment records.
              </p>
            </div>

            <input
              type="search"
              value={paymentSearch}
              onChange={(event) => setPaymentSearch(event.target.value)}
              placeholder="Search payments..."
              aria-label="Search payments"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-600 md:max-w-xs"
            />
          </div>

          {paymentsError ? (
            <SectionError message={paymentsError} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Hospital</th>
                    <th className="px-5 py-4">Package</th>
                    <th className="px-5 py-4">Amount</th>
                    <th className="px-5 py-4">Payment Method</th>
                    <th className="px-5 py-4">Reference</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Paid At</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loading && payments.length === 0 ? (
                    <EmptyRow
                      colSpan={7}
                      text="Loading payment records..."
                    />
                  ) : filteredPayments.length === 0 ? (
                    <EmptyRow
                      colSpan={7}
                      text="No payment records found."
                    />
                  ) : (
                    filteredPayments.map((payment, index) => (
                      <tr
                        key={payment.id ?? index}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 font-semibold">
                          {displayText(payment.hospital_name)}
                          <p className="mt-1 text-xs font-normal text-slate-400">
                            Hospital ID: {displayText(payment.hospital_id)}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <PackageBadge value={payment.package} />
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 font-semibold">
                          {formatMoney(payment.amount)}
                        </td>

                        <td className="px-5 py-4">
                          {displayText(payment.payment_method)}
                          {payment.is_demo && (
                            <p className="mt-1 text-xs text-amber-700">
                              Demo Only
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4 font-mono text-xs">
                          {displayText(payment.reference)}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge value={payment.status} />
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {formatDate(payment.paid_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            Showing {filteredPayments.length} payment record(s)
          </div>
        </section>

        <footer className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-800">
            System Admin · Read-Only Access
          </p>
          <p className="mt-1">
            Hospital package settings and nurse approvals are managed by
            authorized hospital staff. Payment records are available for
            monitoring only.
          </p>
        </footer>
      </div>
    </main>
  );
}

function StatCard({ title, value, description, symbol }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            {value ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 font-bold text-teal-700">
          {symbol}
        </div>
      </div>
    </section>
  );
}

function PackageBadge({ value }) {
  const isPro = String(value || "").toLowerCase() === "pro";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        isPro
          ? "bg-violet-100 text-violet-700"
          : "bg-slate-100 text-slate-700"
      }`}
    >
      {isPro ? "Pro" : displayText(value || "Free")}
    </span>
  );
}

function StatusBadge({ value }) {
  const status = String(value || "unknown").toLowerCase();

  const styles = {
    active: "bg-emerald-100 text-emerald-700",
    paid: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-800",
    inactive: "bg-slate-100 text-slate-600",
    expired: "bg-rose-100 text-rose-700",
    suspended: "bg-rose-100 text-rose-700",
    rejected: "bg-rose-100 text-rose-700",
    failed: "bg-rose-100 text-rose-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function SectionError({ message }) {
  return (
    <div
      role="alert"
      className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
    >
      <p className="font-semibold">Unable to Load This Section</p>
      <p className="mt-1 break-words">{message}</p>
    </div>
  );
}

function EmptyRow({ colSpan, text }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-5 py-10 text-center text-slate-500"
      >
        {text}
      </td>
    </tr>
  );
}
