
"use client";

import { useRouter } from "next/navigation";

export default function CustomerLoginPage() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
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

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-center text-2xl font-bold text-slate-900">
            Customer Access
          </h2>

          <p className="mb-6 mt-2 text-center text-sm text-slate-500">
            Track your queue without creating an account.
          </p>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="w-full rounded-xl bg-[#087f72] px-4 py-4 font-semibold text-white transition hover:bg-[#06665c]"
          >
            Search Queue / Scan QR
          </button>

          <p className="mt-4 text-center text-xs text-slate-500">
            Search for your queue or scan your QR code on the next page.
          </p>

          <button
            type="button"
            onClick={() => router.push("/login")}
            className="mt-5 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Back to Login Selection
          </button>
        </div>
      </div>

      <footer className="mt-8 text-center text-xs text-slate-400">
        QueueCare © 2026
      </footer>
    </main>
  );
}
