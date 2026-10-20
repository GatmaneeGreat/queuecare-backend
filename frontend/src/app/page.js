
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function HomePage() {
  const router = useRouter();

  const [showSplash, setShowSplash] = useState(true);
  const [language, setLanguage] = useState("th");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const text = {
    th: {
      slogan: "ระบบบริหารจัดการคิวโรงพยาบาลอัจฉริยะ",
      title: "ระบบติดตามคิวบริการ",
      subtitle: "ตรวจสอบสถานะคิวของคุณได้ง่าย ๆ",
      qrTitle: "สแกน QR Code บนใบคิว",
      qrText: "ใช้กล้องโทรศัพท์สแกน QR Code บนใบคิว เพื่อดูสถานะคิวของคุณ",
      searchTitle: "หรือค้นหาด้วยชื่อ-นามสกุล",
      placeholder: "กรอกชื่อ-นามสกุล",
      search: "ค้นหาคิว",
      noLogin: "ไม่ต้องเข้าสู่ระบบ",
      loading: "กำลังค้นหาคิวของคุณ...",
      ready: "ระบบพร้อมใช้งานแล้ว!",
      startup: "กำลังโหลดข้อมูลระบบ...",
      footer: "QueueCare v1.0 • Ready for Hospital Service",
      empty: "กรุณากรอกชื่อ-นามสกุล",
      failed: "ไม่พบคิวที่กำลังรอหรือรับบริการ กรุณาตรวจสอบชื่ออีกครั้ง",
      network: "ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง",
    },
    en: {
      slogan: "Smart Hospital Queue Management System",
      title: "Queue Tracking",
      subtitle: "Check your queue status easily",
      qrTitle: "Scan the QR Code on your ticket",
      qrText: "Use your phone camera to scan the QR Code on your ticket.",
      searchTitle: "Or search by full name",
      placeholder: "Enter full name",
      search: "Search Queue",
      noLogin: "No login required",
      loading: "Searching for your queue...",
      ready: "System is ready!",
      startup: "Loading system...",
      footer: "QueueCare v1.0 • Ready for Hospital Service",
      empty: "Please enter your full name.",
      failed: "No active queue was found. Please check the name.",
      network: "Unable to connect to the system. Please try again.",
    },
  }[language];

  async function handleSearch(event) {
    event.preventDefault();

    const cleanName = name.trim();

    if (!cleanName) {
      setError(text.empty);
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/queues/search?name=${encodeURIComponent(cleanName)}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || text.failed);
      }

      if (!data.token) {
        throw new Error(text.failed);
      }

      router.push(`/track/${encodeURIComponent(data.token)}`);
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? text.network
          : err.message || text.failed
      );
      setLoading(false);
    }
  }

  if (showSplash || loading) {
    const isSearching = loading;

    return (
      <main className="qc-splash">
        <div className="qc-splash-top">
          <div className="qc-logo-icon">🏥</div>

          <h1 className="qc-brand">
            Queue<span>Care</span>
          </h1>

          <p className="qc-slogan">{text.slogan}</p>
        </div>

        <section className="qc-splash-bottom">
          <div className="qc-floating-icons">
            <span>🎫</span>
            <span>🩺</span>
            <span>⚡</span>
          </div>

          <div className="qc-progress-info">
            <span>
              <i className="qc-pulse-dot" />
              {isSearching ? text.loading : text.startup}
            </span>

            <span className="qc-progress-percent">
              {isSearching ? "..." : "100%"}
            </span>
          </div>

          <div className="qc-progress-track">
            <div
              className={
                isSearching
                  ? "qc-progress-bar qc-progress-indeterminate"
                  : "qc-progress-bar qc-progress-complete"
              }
            />
          </div>

          <p className="qc-splash-footer">{text.footer}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="qc-home">
      <header className="qc-header">
        <a href="/" className="qc-header-brand">
          🏥 Queue<span>Care</span>
        </a>

        <div className="qc-language">
          <button
            type="button"
            className={language === "th" ? "active" : ""}
            onClick={() => setLanguage("th")}
          >
            ไทย
          </button>

          <button
            type="button"
            className={language === "en" ? "active" : ""}
            onClick={() => setLanguage("en")}
          >
            EN
          </button>
        </div>
      </header>

      <section className="qc-home-card">
        <div className="qc-home-icon">🎫</div>

        <h1>{text.title}</h1>
        <p className="qc-home-subtitle">{text.subtitle}</p>

        <div className="qc-qr-section">
          <div className="qc-qr-icon">▦</div>
          <h2>{text.qrTitle}</h2>
          <p>{text.qrText}</p>
          <p className="qc-qr-note">
            {language === "th"
              ? "หากไม่มี QR Code สามารถค้นหาด้วยชื่อด้านล่าง"
              : "If you do not have a QR Code, search by name below."}
          </p>
        </div>

        <div className="qc-divider">
          <span>{text.searchTitle}</span>
        </div>

        <form onSubmit={handleSearch}>
          <label htmlFor="patientName">{text.searchTitle}</label>

          <input
            id="patientName"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={text.placeholder}
            autoComplete="name"
            disabled={loading}
          />

          {error && <p className="qc-error">{error}</p>}

          <button
            className="qc-search-button"
            type="submit"
            disabled={loading}
          >
            {text.search}
          </button>
        </form>

        <p className="qc-no-login">🔓 {text.noLogin}</p>
      </section>

      <footer className="qc-home-footer">
        © QueueCare — Smart Hospital Queue Management
      </footer>
    </main>
  );
}
