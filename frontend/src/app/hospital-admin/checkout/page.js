
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function CheckoutPage() {
  const router = useRouter();

  const [token, setToken] = useState("");
  const [profile, setProfile] = useState(null);
  const [hospital, setHospital] = useState(null);
  const [payment, setPayment] = useState(null);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const request = useCallback(async (path, options = {}) => {
    if (!API_URL) {
      throw new Error("ไม่พบ NEXT_PUBLIC_API_URL ในการตั้งค่า Frontend");
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("queuecare_token")}`,
        ...(options.headers || {}),
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        typeof data.detail === "string"
          ? data.detail
          : "ไม่สามารถดำเนินการได้ กรุณาลองอีกครั้ง";

      throw new Error(message);
    }

    return data;
  }, []);

  const loadData = useCallback(async () => {
    const savedToken = localStorage.getItem("queuecare_token");

    if (!savedToken) {
      router.replace("/login");
      return;
    }

    setToken(savedToken);

    try {
      const me = await request("/auth/me");
      setProfile(me);

      if (me.role === "nurse") {
        router.replace("/nurse");
        return;
      }

      if (me.role === "admin") {
        router.replace("/admin");
        return;
      }

      if (me.role !== "hospital_admin") {
        router.replace("/login");
        return;
      }

      const dashboard = await request("/hospital-admin/dashboard");
      setHospital(dashboard);
    } catch (err) {
      setError(err.message || "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [request, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function createPayment() {
    setError("");
    setSuccess("");
    setCreating(true);

    try {
      const result = await request("/hospital-admin/subscription/demo", {
        method: "POST",
      });

      setPayment(result);
      setSuccess(
        result.status === "paid"
          ? "รายการนี้ชำระสำเร็จแล้ว"
          : "สร้างรายการชำระเงินจำลองเรียบร้อยแล้ว"
      );

      const dashboard = await request("/hospital-admin/dashboard");
      setHospital(dashboard);
    } catch (err) {
      setError(err.message || "สร้างรายการชำระเงินไม่สำเร็จ");
    } finally {
      setCreating(false);
    }
  }

  async function confirmPayment() {
    if (!payment?.id) {
      setError("ไม่พบรายการชำระเงิน กรุณาสร้างรายการก่อน");
      return;
    }

    setError("");
    setSuccess("");
    setConfirming(true);

    try {
      const result = await request(
        `/hospital-admin/subscription/demo/${payment.id}/confirm`,
        { method: "POST" }
      );

      setPayment((previous) => ({
        ...previous,
        ...result,
        status: result.payment_status || result.status || "paid",
      }));

      setSuccess(
        "จำลองการชำระเงินสำเร็จแล้ว! ระบบได้เปิดใช้งานแพ็กเกจ Pro ให้โรงพยาบาลของคุณ"
      );

      const [me, dashboard] = await Promise.all([
        request("/auth/me"),
        request("/hospital-admin/dashboard"),
      ]);

      setProfile(me);
      setHospital(dashboard);
    } catch (err) {
      setError(err.message || "ยืนยันการชำระเงินไม่สำเร็จ");
    } finally {
      setConfirming(false);
    }
  }

  function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  const packageName = hospital?.package || profile?.package || "free";
  const expiryDate = hospital?.subscription_expires_at;
  const isActivePro =
    packageName.toLowerCase() === "pro" &&
    (!expiryDate || new Date(expiryDate).getTime() > Date.now());

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <p className="text-slate-600">กำลังโหลดข้อมูล...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => router.back()}
          className="mb-6 text-sm text-blue-700 hover:underline"
        >
          ← กลับหน้าก่อนหน้า
        </button>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <p className="text-sm font-medium text-blue-700">QueueCare</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Subscription Checkout
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              จัดการแพ็กเกจสำหรับโรงพยาบาลของคุณ
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  QueueCare Pro
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  สำหรับโรงพยาบาลที่ต้องการใช้แพ็กเกจ Pro
                </p>
              </div>

              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                {isActivePro ? "ใช้งานอยู่" : "แพ็กเกจ Pro"}
              </span>
            </div>

            <div className="mt-5">
              <span className="text-3xl font-bold text-slate-900">
                ฿799
              </span>
              <span className="ml-2 text-sm text-slate-500">/ เดือน</span>
            </div>

            <div className="mt-4 space-y-1 text-sm text-slate-600">
              <p>
                โรงพยาบาล:{" "}
                <span className="font-medium text-slate-900">
                  {hospital?.hospital_name || hospital?.name || profile?.hospital_name || "-"}
                </span>
              </p>
              <p>
                แพ็กเกจปัจจุบัน:{" "}
                <span className="font-medium text-slate-900">
                  {packageName.toUpperCase()}
                </span>
              </p>

              {expiryDate && (
                <p>
                  วันหมดอายุ:{" "}
                  <span className="font-medium text-slate-900">
                    {formatDate(expiryDate)}
                  </span>
                </p>
              )}
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
            >
              {success}
            </div>
          )}

          {isActivePro ? (
            <div className="mt-6 rounded-xl bg-green-50 p-5">
              <h2 className="font-bold text-green-800">
                โรงพยาบาลของคุณใช้แพ็กเกจ Pro อยู่แล้ว
              </h2>
              <p className="mt-2 text-sm text-green-700">
                {expiryDate
                  ? `แพ็กเกจหมดอายุวันที่ ${formatDate(expiryDate)}`
                  : "แพ็กเกจ Pro กำลังใช้งานอยู่"}
              </p>
              <button
                onClick={() => router.push("/hospital-admin")}
                className="mt-4 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
              >
                กลับหน้า Hospital Admin
              </button>
            </div>
          ) : (
            <>
              <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
                <p className="font-bold text-amber-900">
                  ⚠️ Demo Payment Only
                </p>
                <p className="mt-1 text-sm text-amber-800">
                  QR ในหน้านี้เป็นเพียงตัวอย่างสำหรับสาธิต ไม่ใช่ QR
                  PromptPay จริง และไม่มีการโอนหรือเรียกเก็บเงินจริง
                </p>
              </div>

              {!payment ? (
                <button
                  onClick={createPayment}
                  disabled={creating}
                  className="mt-6 w-full rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creating
                    ? "กำลังสร้างรายการ..."
                    : "สร้างรายการชำระเงินจำลอง"}
                </button>
              ) : (
                <div className="mt-6">
                  <div className="rounded-xl border border-slate-200 p-5">
                    <div className="text-center">
                      <p className="text-sm text-slate-500">
                        Demo PromptPay QR
                      </p>
                      <div
                        aria-label="QR placeholder for demonstration only"
                        className="mx-auto mt-4 flex h-48 w-48 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4"
                      >
                        <div className="text-center">
                          <div className="mx-auto mb-3 grid h-16 w-16 grid-cols-3 gap-1 opacity-50">
                            {Array.from({ length: 9 }, (_, index) => (
                              <span
                                key={index}
                                className={`rounded-sm ${
                                  [0, 2, 4, 6, 8].includes(index)
                                    ? "bg-slate-800"
                                    : "bg-slate-300"
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-xs font-bold text-slate-600">
                            QR จำลอง
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            ใช้สาธิตเท่านั้น
                          </p>
                        </div>
                      </div>

                      <p className="mt-4 text-2xl font-bold text-slate-900">
                        ฿{payment.amount ?? 799}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        Reference: {payment.reference || `DEMO-${payment.id}`}
                      </p>
                      <p className="mt-2 text-sm">
                        สถานะ:{" "}
                        <span className="font-semibold text-amber-700">
                          {(payment.status || "pending").toUpperCase()}
                        </span>
                      </p>
                    </div>
                  </div>

                  {payment.status !== "paid" && (
                    <button
                      onClick={confirmPayment}
                      disabled={confirming}
                      className="mt-4 w-full rounded-xl bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {confirming
                        ? "กำลังยืนยัน..."
                        : "Simulate payment success"}
                    </button>
                  )}

                  {payment.status === "paid" && (
                    <div className="mt-4 rounded-lg bg-green-50 p-4 text-center text-sm font-semibold text-green-800">
                      รายการนี้ชำระสำเร็จแล้ว
                    </div>
                  )}

                  <button
                    onClick={createPayment}
                    disabled={creating}
                    className="mt-3 w-full rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    ตรวจสอบ / โหลดรายการอีกครั้ง
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <p className="mt-5 text-center text-xs text-slate-500">
          QueueCare · Subscription Demo Environment
        </p>
      </div>
    </main>
  );
}
