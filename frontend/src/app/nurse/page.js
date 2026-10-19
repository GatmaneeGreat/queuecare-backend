
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function getEnglishPosition(position) {
  const translations = {
    "พยาบาลประจำจุดบริการ": "Service Point Nurse",
    "พยาบาล": "Nurse",
    "ผู้ดูแลระบบ": "Administrator",
  };

  return translations[position] || position || "Not specified";
}

function getEnglishHospitalName(name) {
  return name === "โรงพยาบาลตัวอย่าง"
    ? "Sample Hospital"
    : name || "Not assigned";
}

function getQueueNumberValue(number) {
  const match = String(number ?? "").match(/^[QA](\d+)$/i);
  return match ? Number(match[1]) : 0;
}

function getQueueStatus(status) {
  return String(status ?? "").toLowerCase();
}

export default function NurseDashboard() {
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [services, setServices] = useState([]);
  const [queues, setQueues] = useState([]);
  const [servicesError, setServicesError] = useState("");
  const [queuesError, setQueuesError] = useState("");

  const [patientName, setPatientName] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [creating, setCreating] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [createdQueue, setCreatedQueue] = useState(null);

  const loadProfile = useCallback(async () => {
    const token = localStorage.getItem("queuecare_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setLoading(true);
      setError("");

      if (!API_URL) {
        throw new Error("Backend URL is not configured.");
      }

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
          return;
        }

        localStorage.removeItem("queuecare_token");
        router.replace("/login");
        return;
      }

      setProfile(data);
    } catch (err) {
      setError(err.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadDashboardData = useCallback(async () => {
    const token = localStorage.getItem("queuecare_token");

    if (!token || !API_URL) return;

    const headers = {
      Authorization: `Bearer ${token}`,
    };

    try {
      setServicesError("");

      const response = await fetch(`${API_URL}/services/`, {
        headers,
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Unable to load service departments.");
      }

      const data = await response.json();
      setServices(Array.isArray(data) ? data : []);
    } catch (err) {
      setServicesError(err.message || "Unable to load services.");
    }

    try {
      setQueuesError("");

      const response = await fetch(`${API_URL}/queues/`, {
        headers,
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Unable to load queues.");
      }

      const data = await response.json();
      setQueues(Array.isArray(data) ? data : []);
    } catch (err) {
      setQueuesError(err.message || "Unable to load queues.");
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (profile) {
      loadDashboardData();
    }
  }, [profile, loadDashboardData]);

  function handleLogout() {
    localStorage.removeItem("queuecare_token");
    router.replace("/login");
  }

  function getServiceName(id) {
    const service = services.find(
      (item) => Number(item.id) === Number(id)
    );

    return service?.name || `Service #${id ?? "-"}`;
  }

  function formatQueueTime(dateValue) {
    if (!dateValue) return "-";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString();
  }

  async function handleCreateQueue(event) {
    event.preventDefault();

    setFormMessage("");
    setCreatedQueue(null);

    const token = localStorage.getItem("queuecare_token");

    if (!token || !API_URL || !profile) {
      setFormMessage("Please log in again before creating a queue.");
      return;
    }

    if (!patientName.trim()) {
      setFormMessage("Please enter the patient's name.");
      return;
    }

    if (!serviceId) {
      setFormMessage("Please select a service department.");
      return;
    }

    setCreating(true);

    try {
      const queuesResponse = await fetch(`${API_URL}/queues/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (!queuesResponse.ok) {
        throw new Error("Unable to check existing queue numbers.");
      }

      const latestQueues = await queuesResponse.json();
      const queueList = Array.isArray(latestQueues) ? latestQueues : [];

      setQueues(queueList);

      const serviceQueues = queueList.filter(
        (queue) => Number(queue.service_id) === Number(serviceId)
      );

      const highestNumber = serviceQueues.reduce((max, queue) => {
        return Math.max(max, getQueueNumberValue(queue.number));
      }, 0);

      const queueNumber = `A${String(highestNumber + 1).padStart(3, "0")}`;

      const response = await fetch(`${API_URL}/queues/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: queueNumber,
          user_id: profile.id,
          service_id: Number(serviceId),
          patient_name: patientName.trim(),
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.detail || "Unable to register the patient queue."
        );
      }

      setCreatedQueue(result);
      setFormMessage("Queue created successfully.");
      setPatientName("");

      await loadDashboardData();
    } catch (err) {
      setFormMessage(
        err.message || "Unable to connect to the server."
      );
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f0f7f5]">
        <p className="text-[#087f72]">Loading your dashboard...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f0f7f5] p-6">
        <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-800">
            Unable to Load Dashboard
          </h1>

          <p className="mt-3 text-sm text-red-600">{error}</p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={loadProfile}
              className="rounded-xl bg-[#087f72] px-5 py-3 font-semibold text-white hover:bg-[#06665c]"
            >
              Try Again
            </button>

            <button
              onClick={handleLogout}
              className="rounded-xl border border-slate-300 px-5 py-3 text-slate-600 hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!profile) return null;

  const packageName =
    profile.package?.toLowerCase() === "pro"
      ? "Pro"
      : profile.package?.toLowerCase() === "free"
        ? "Free"
        : "Not Assigned";

  const sortedQueues = [...queues].sort((a, b) => {
    return (
      new Date(b.created_at || 0).getTime() -
      new Date(a.created_at || 0).getTime()
    );
  });

  const currentQueues = sortedQueues.filter((queue) =>
    ["waiting", "serving"].includes(getQueueStatus(queue.status))
  );

  const previousQueues = sortedQueues.filter((queue) =>
    ["completed", "done", "cancelled"].includes(
      getQueueStatus(queue.status)
    )
  );

  return (
    <main className="min-h-screen bg-[#f0f7f5] text-slate-800">
      {/* Top navigation */}
      <header className="border-b border-[#dcebe7] bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div>
            <h1 className="text-2xl font-bold text-[#087f72]">
              QueueCare
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Nurse Portal
            </p>
          </div>

          {/* Package, nurse information, Profile and Logout */}
          <div className="flex flex-wrap items-center justify-end gap-3">
            <span
              className={`inline-flex cursor-default select-none items-center rounded-xl px-4 py-2 text-sm font-bold ${
                packageName === "Pro"
                  ? "bg-emerald-100 text-emerald-700"
                  : packageName === "Free"
                    ? "bg-slate-100 text-slate-600"
                    : "bg-amber-100 text-amber-700"
              }`}
              title="Current hospital package"
              aria-label={`Current hospital package: ${packageName}`}
            >
              {packageName.toUpperCase()}
            </span>

            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{profile.name}</p>
              <p className="text-xs text-slate-500">
                {getEnglishPosition(profile.position)}
              </p>
            </div>

            <button
              onClick={() => router.push("/nurse/profile")}
              className="rounded-xl border border-[#b8dcd3] px-4 py-2 text-sm font-semibold text-[#087f72] transition hover:bg-[#edf8f5]"
            >
              Profile
            </button>

            <button
              onClick={handleLogout}
              className="rounded-xl bg-[#087f72] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#06665c]"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        {/* Welcome */}
        <section className="mb-7">
          <p className="text-sm font-semibold text-[#087f72]">
            NURSE DASHBOARD
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            Welcome, {profile.name}
          </h2>

          <p className="mt-2 text-slate-500">
            Register patients and manage your service queue.
          </p>
        </section>

        {/* Staff and hospital information */}
        <section className="mb-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-[#dcebe7] bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Staff Name</p>
            <h3 className="mt-2 break-words text-lg font-bold">
              {profile.name}
            </h3>
            <p className="mt-1 break-words text-sm text-slate-500">
              {profile.email}
            </p>
          </div>

          <div className="rounded-2xl border border-[#dcebe7] bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Position</p>
            <h3 className="mt-2 text-lg font-bold">
              {getEnglishPosition(profile.position)}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Hospital Staff
            </p>
          </div>

          {/* Hospital information — View Packages removed */}
          <div className="rounded-2xl border border-[#dcebe7] bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Hospital</p>
            <h3 className="mt-2 break-words text-lg font-bold">
              {getEnglishHospitalName(profile.hospital_name)}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Hospital ID: {profile.hospital_id ?? "-"}
            </p>
          </div>
        </section>

        {/* Patient queue registration */}
        <section className="grid items-start gap-7 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-[#dcebe7] bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold text-[#087f72]">
              PATIENT REGISTRATION
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Create a Queue
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Enter the patient's name and choose a service department.
            </p>

            <form onSubmit={handleCreateQueue} className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="patientName"
                  className="mb-2 block text-sm font-semibold"
                >
                  Patient Name
                </label>

                <input
                  id="patientName"
                  type="text"
                  value={patientName}
                  onChange={(event) => setPatientName(event.target.value)}
                  placeholder="Enter patient's full name"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#087f72] focus:ring-2 focus:ring-[#087f72]/10"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="serviceId"
                  className="mb-2 block text-sm font-semibold"
                >
                  Service Department
                </label>

                <select
                  id="serviceId"
                  value={serviceId}
                  onChange={(event) => setServiceId(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#087f72]"
                  required
                >
                  <option value="">Select a service</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>

                {servicesError && (
                  <p className="mt-2 text-sm text-red-600">
                    {servicesError}
                  </p>
                )}

                {!servicesError && services.length === 0 && (
                  <p className="mt-2 text-sm text-slate-500">
                    No services are available.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={creating || services.length === 0}
                className="w-full rounded-xl bg-[#087f72] px-5 py-3 font-semibold text-white transition hover:bg-[#06665c] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? "Creating Queue..." : "Register Patient Queue"}
              </button>
            </form>

            {formMessage && (
              <p
                role="status"
                className={`mt-4 rounded-xl p-3 text-sm ${
                  formMessage.toLowerCase().includes("success")
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {formMessage}
              </p>
            )}

            {createdQueue && (
              <div className="mt-5 rounded-2xl border border-[#b8dcd3] bg-[#edf8f5] p-5">
                <p className="text-sm text-[#087f72]">
                  Queue created successfully
                </p>

                <p className="mt-1 text-3xl font-bold text-[#087f72]">
                  {createdQueue.number}
                </p>

                <p className="mt-2 text-sm text-slate-600">
                  Patient:{" "}
                  {createdQueue.user?.name || "Registered patient"}
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  Service: {getServiceName(createdQueue.service_id)}
                </p>

                {createdQueue.share_token && (
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/nurse/ticket?token=${encodeURIComponent(
                          createdQueue.share_token
                        )}`
                      )
                    }
                    className="mt-4 rounded-xl border border-[#087f72] px-4 py-2 font-semibold text-[#087f72] hover:bg-white"
                  >
                    View Patient Ticket
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Queue lists */}
          <div className="space-y-7">
            <section className="rounded-2xl border border-[#dcebe7] bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#087f72]">
                    QUEUE MANAGEMENT
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">
                    Current Queue
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={loadDashboardData}
                  className="rounded-xl border border-[#b8dcd3] px-4 py-2 text-sm font-semibold text-[#087f72] hover:bg-[#edf8f5]"
                >
                  Refresh
                </button>
              </div>

              {queuesError && (
                <p className="mt-4 text-sm text-red-600">
                  {queuesError}
                </p>
              )}

              <div className="mt-5 max-h-[420px] space-y-3 overflow-y-auto pr-2">
                {currentQueues.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    No current queues.
                  </p>
                ) : (
                  currentQueues.map((queue) => (
                    <div
                      key={queue.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-4"
                    >
                      <div>
                        <p className="font-bold">{queue.number}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {queue.user?.name || `Patient ID: ${queue.user_id}`}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {getServiceName(queue.service_id)}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                          {queue.status}
                        </span>
                        <p className="mt-2 text-xs text-slate-400">
                          {formatQueueTime(queue.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-[#dcebe7] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Previous Queue</h2>

              <div className="mt-4 max-h-[300px] space-y-3 overflow-y-auto pr-2">
                {previousQueues.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    No previous queues.
                  </p>
                ) : (
                  previousQueues.slice(0, 5).map((queue) => (
                    <div
                      key={queue.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-4"
                    >
                      <div>
                        <p className="font-bold">{queue.number}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {queue.user?.name || `Patient ID: ${queue.user_id}`}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {getServiceName(queue.service_id)}
                        </p>
                      </div>

                      <span className="text-xs text-slate-500">
                        {queue.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </section>

        {/* Subscription card removed as requested */}
        <footer className="py-8 text-center text-xs text-slate-400">
          QueueCare © 2026
        </footer>
      </div>
    </main>
  );
}
