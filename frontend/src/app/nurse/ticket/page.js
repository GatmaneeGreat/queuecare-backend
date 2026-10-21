
"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function PatientTicketContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTicket() {
      if (!token) {
        setError("Ticket token is missing.");
        setLoading(false);
        return;
      }

      if (!API_URL) {
        setError("Backend URL is not configured.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/queues/public/${encodeURIComponent(token)}`,
          { cache: "no-store" }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Unable to load the ticket.");
        }

        setTicket(data);
      } catch (err) {
        setError(err.message || "Unable to connect to the server.");
      } finally {
        setLoading(false);
      }
    }

    loadTicket();
  }, [token]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f0f7f5]">
        Loading patient ticket...
      </main>
    );
  }

  if (error || !ticket) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f0f7f5] p-6">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-800">
            Unable to Load Ticket
          </h1>
          <p className="mt-3 text-sm text-red-600">
            {error || "Ticket not found."}
          </p>
          <a
            href="/nurse"
            className="mt-5 inline-block rounded-xl bg-[#087f72] px-5 py-3 font-semibold text-white"
          >
            Back to Dashboard
          </a>
        </div>
      </main>
    );
  }

  const patientName =
    ticket.user?.name || ticket.patient_name || "Patient";

  const serviceName = ticket.service?.name || "General Service";

  const trackingUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/nurse/ticket?token=${encodeURIComponent(token)}`
      : "";

  return (
    <main className="min-h-screen bg-[#f0f7f5] px-5 py-10 text-slate-800">
      <div className="mx-auto max-w-md">
        <a
          href="/nurse"
          className="mb-5 inline-block font-semibold text-[#087f72] hover:underline"
        >
          ← Back to Nurse Dashboard
        </a>

        <section className="rounded-3xl border border-[#dcebe7] bg-white p-7 text-center shadow-sm">
          <p className="text-sm font-semibold tracking-wider text-[#087f72]">
            QUEUECARE · PATIENT TICKET
          </p>

          <h1 className="mt-3 text-2xl font-bold">
            Your Queue Ticket
          </h1>

          <p className="mt-2 text-slate-500">
            Please keep this ticket for queue tracking.
          </p>

          <div className="mt-6 rounded-2xl bg-[#edf8f5] p-6">
            <p className="text-sm text-[#087f72]">Queue Number</p>
            <p className="mt-1 text-5xl font-extrabold text-[#087f72]">
              {ticket.number}
            </p>
            <p className="mt-4 text-sm text-slate-600">
              Patient: {patientName}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Service: {serviceName}
            </p>
            <p className="mt-3 inline-block rounded-full bg-white px-4 py-1 text-sm font-semibold text-amber-700">
              {ticket.status}
            </p>
          </div>

          <div className="mt-7">
            <p className="mb-3 font-semibold">Scan to Track Your Queue</p>
            <div className="inline-block rounded-xl border border-slate-100 bg-white p-4">
              <QRCodeSVG value={trackingUrl} size={200} level="M" />
            </div>
            <p className="mt-3 break-all text-xs text-slate-400">
              Scan the QR code to open this ticket.
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-slate-100 p-4">
            <p className="text-sm text-slate-500">
              People ahead of you
            </p>
            <p className="mt-1 text-2xl font-bold text-[#087f72]">
              {ticket.ahead_count ?? 0}
            </p>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="mt-6 w-full rounded-xl bg-[#087f72] px-5 py-3 font-semibold text-white hover:bg-[#06665c]"
          >
            Print Ticket
          </button>
        </section>
      </div>
    </main>
  );
}

export default function PatientTicketPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f0f7f5]">
          Loading patient ticket...
        </main>
      }
    >
      <PatientTicketContent />
    </Suspense>
  );
}
