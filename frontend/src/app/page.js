"use client";

import { useEffect, useRef, useState } from "react";
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
  const [showScanner, setShowScanner] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const scannerRef = useRef(null);
  const scannerInstanceRef = useRef(null);
  const scanHandledRef = useRef(false);

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

async function stopScanner() {
  const scanner = scannerInstanceRef.current;

  if (scanner) {
    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      scanner.clear();
    } catch (err) {
      console.error("Unable to stop QR scanner:", err);
    } finally {
      scannerInstanceRef.current = null;
    }
  }

  setShowScanner(false);
}

async function startScanner() {
  setScannerError("");
  scanHandledRef.current = false;
  setShowScanner(true);
}

useEffect(() => {
  if (!showScanner) return;

  let cancelled = false;
  let scanner = null;

  async function initializeScanner() {
    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      if (cancelled || !scannerRef.current) return;

      scanner = new Html5Qrcode(scannerRef.current.id);
      scannerInstanceRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          if (scanHandledRef.current) return;
          scanHandledRef.current = true;

          try {
            const scannedValue = decodedText.trim();
            let token = scannedValue;

            if (scannedValue.startsWith("http://") ||
                scannedValue.startsWith("https://")) {
              const url = new URL(scannedValue);
              const match = url.pathname.match(/\/track\/([^/]+)/);

              if (!match) {
                throw new Error(
                  language === "th"
                    ? "QR Code นี้ไม่ใช่ลิงก์ติดตามคิว"
                    : "This QR Code is not a queue tracking link."
                );
              }

              token = decodeURIComponent(match[1]);
            } else if (scannedValue.includes("/")) {
              throw new Error(
                language === "th"
                  ? "รูปแบบ QR Code ไม่ถูกต้อง"
                  : "Invalid QR Code format."
              );
            }

            if (!token) {
              throw new Error(
                language === "th"
                  ? "ไม่พบ Token ใน QR Code"
                  : "No token found in the QR Code."
              );
            }

            await stopScanner();
            router.push(`/track/${encodeURIComponent(token)}`);
          } catch (err) {
            scanHandledRef.current = false;
            setScannerError(
              err.message ||
                (language === "th"
                  ? "ไม่สามารถอ่าน QR Code นี้ได้"
                  : "Unable to read this QR Code.")
            );
          }
        },
        () => {}
      );
    } catch (err) {
      if (!cancelled) {
        setScannerError(
          language === "th"
            ? "เปิดกล้องไม่ได้ กรุณาอนุญาตให้เบราว์เซอร์ใช้กล้อง และลองอีกครั้ง"
            : "Unable to open camera. Please allow camera access and try again."
        );
        console.error("QR scanner initialization failed:", err);
      }
    }
  }

  initializeScanner();

  return () => {
    cancelled = true;

    if (scannerInstanceRef.current) {
      const currentScanner = scannerInstanceRef.current;
      scannerInstanceRef.current = null;

      if (currentScanner.isScanning) {
        currentScanner
          .stop()
          .then(() => currentScanner.clear())
          .catch((err) => {
            console.error("Unable to clean up QR scanner:", err);
          });
      } else {
        try {
          currentScanner.clear();
        } catch (err) {
          console.error("Unable to clear QR scanner:", err);
        }
      }
    }
  };
}, [showScanner, language, router]);

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
          <button
            type="button"
            className="qc-search-button"
            onClick={startScanner}
         >
            {language === "th" ? "📷 เปิดกล้องสแกน QR" : "📷 Scan QR Code"}
          </button>
          <p className="qc-qr-note">
            {language === "th"
              ? "หากไม่มี QR Code สามารถค้นหาด้วยชื่อด้านล่าง"
              : "If you do not have a QR Code, search by name below."}
          </p>
        </div>
        {showScanner && (
          <div className="qc-scanner-panel">
            <div
              id="queuecare-qr-reader"
              ref={scannerRef}
              style={{ width: "100%", maxWidth: "400px", margin: "0 auto" }}
            />

            {scannerError && (
              <p className="qc-error">{scannerError}</p>
            )}

            <button
              type="button"
              className="qc-search-button"
              onClick={stopScanner}
            >
              {language === "th" ? "ปิดกล้อง" : "Close Camera"}
            </button>
          </div>
        )}
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
