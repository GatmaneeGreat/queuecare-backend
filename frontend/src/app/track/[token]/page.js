
"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const STATUS = {
  waiting: "รอเรียกเข้าห้องตรวจ",
  serving: "กำลังให้บริการ",
  completed: "ให้บริการเสร็จแล้ว",
  cancelled: "ยกเลิกคิว",
};

function QueueTrackingContent() {
  const params = useParams();
  const router = useRouter();
  const token = params.token;

  const [queue, setQueue] = useState(null);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);

  const loadQueue = useCallback(async () => {
    if (!token) {
      setError("ไม่พบ Token ของคิว");
      setInitialLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/queues/public/${encodeURIComponent(token)}`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "ไม่สามารถโหลดข้อมูลคิวได้"
        );
      }

      setQueue(data);
      setError("");

      setLastUpdated(
        new Date().toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "ไม่สามารถเชื่อมต่อระบบได้"
          : err.message || "เกิดข้อผิดพลาด"
      );
    } finally {
      setInitialLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadQueue();

    const timer = setInterval(loadQueue, 5000);

    return () => clearInterval(timer);
  }, [loadQueue]);

  if (initialLoading) {
    return (
      <main className="qc-splash">
        <div className="qc-splash-top">
          <div className="qc-logo-icon">🏥</div>
          <h1 className="qc-brand">
            Queue<span>Care</span>
          </h1>
          <p className="qc-slogan">กำลังโหลดสถานะคิวของคุณ...</p>
        </div>

        <section className="qc-splash-bottom">
          <div className="qc-floating-icons">
            <span>🎫</span>
            <span>🩺</span>
            <span>⚡</span>
          </div>
          <div className="qc-progress-track">
            <div className="qc-progress-bar qc-progress-indeterminate" />
          </div>
          <p className="qc-splash-footer">
            QueueCare • Queue Tracking
          </p>
        </section>
      </main>
    );
  }

  if (error && !queue) {
    return (
      <main className="qc-track-page">
        <section className="qc-track-card qc-track-error">
          <div className="qc-track-icon">⚠️</div>
          <h1>ไม่สามารถแสดงสถานะคิวได้</h1>
          <p>{error}</p>

          <button
            className="qc-track-button"
            onClick={() => router.push("/")}
          >
            กลับหน้าหลัก
          </button>

          <button
            className="qc-track-secondary"
            onClick={loadQueue}
          >
            ลองอีกครั้ง
          </button>
        </section>
      </main>
    );
  }

  const status = STATUS[queue?.status] || queue?.status || "-";
  const aheadCount = queue?.ahead_count ?? 0;

  return (
    <main className="qc-track-page">
      <div className="qc-track-container">
        <header className="qc-track-topbar">
          <button
            className="qc-back-button"
            onClick={() => router.push("/")}
          >
            ← กลับหน้าหลัก / Back
          </button>

          <span className="qc-live-badge">
            <i /> Live
          </span>
        </header>

        <section className="qc-track-card">
          <div className="qc-patient-row">
            <div>
              <p className="qc-track-label">
                ผู้ป่วยรับบริการ / Patient
              </p>
              <h2>
                {queue?.patient_name
                  ? `คุณ ${queue.patient_name}`
                  : queue?.user?.name
                    ? `คุณ ${queue.user.name}`
                    : "ไม่พบข้อมูลผู้ป่วย"}
              </h2>
            </div>
          </div>

          <div className="qc-queue-number">
            <p>หมายเลขคิวของคุณ / Your Queue</p>
            <strong>{queue?.number || "-"}</strong>
            <span>
              {queue?.service?.name || "ไม่ระบุห้องตรวจ"}
            </span>
          </div>

          <div className="qc-status-panel">
            <div>
              <p>สถานะปัจจุบัน / Current Status</p>
              <strong>{status}</strong>
            </div>

            <div className="qc-ahead">
              <p>คิวก่อนหน้าคุณ / Ahead</p>
              <strong>{aheadCount}</strong>
              <span>คิว</span>
            </div>
          </div>

          <div className="qc-serving-row">
            <span>คิวที่กำลังให้บริการ (Serving)</span>
            <strong>{queue?.current_serving_number || "-"}</strong>
          </div>

          <div className="qc-serving-row">
            <span>อัปเดตล่าสุด / Last Updated</span>
            <strong>{lastUpdated || "-"}</strong>
          </div>

          <p className="qc-refresh-note">
            ระบบตรวจสอบสถานะคิวทุก 5 วินาที
          </p>

          {error && (
            <p className="qc-track-warning">
              อัปเดตไม่สำเร็จ: {error}
            </p>
          )}
        </section>

        <section className="qc-track-notice">
          <strong>🔔 แจ้งเตือนเมื่อใกล้ถึงคิว</strong>
          <p>
            หน้านี้แสดงสถานะคิวปัจจุบัน
            โปรดติดตามข้อมูลและประกาศจากโรงพยาบาล
          </p>
        </section>
      </div>
    </main>
  );
}

export default function QueueTrackingPage() {
  return (
    <Suspense
      fallback={
        <main className="qc-splash">
          <div className="qc-splash-top">
            <div className="qc-logo-icon">🏥</div>
            <h1 className="qc-brand">
              Queue<span>Care</span>
            </h1>
            <p className="qc-slogan">
              กำลังโหลดสถานะคิวของคุณ...
            </p>
          </div>
        </main>
      }
    >
      <QueueTrackingContent />
    </Suspense>
  );
}

