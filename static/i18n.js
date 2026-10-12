(() => {
  "use strict";

  const STORAGE_KEY = "queuecare_language";

  const translations = {
    "ระบบติดตามคิวบริการ": "Live Queue Tracking",
    "เลือกแพ็กเกจบริการ": "Select Service Package",
    "ธรรมดา": "Standard",
    "โปร": "Pro",
    "กรณีไม่มี QR Code ค้นหาด้วยชื่อ-นามสกุล": "No QR Code? Search by Full Name",
    "ค้นหาด้วยชื่อ-นามสกุล": "Search by Full Name",
    "กรุณากรอกชื่อ-นามสกุลของผู้ป่วย": "Please enter the patient's full name.",
    "ไม่พบข้อมูลผู้ป่วย": "Patient not found.",
    "กำลังค้นหา...": "Searching...",
    "ค้นหา": "Search",
    "กลับหน้าหลัก": "Back to Home",
    "อัปเดตสดแบบเรียลไทม์": "Live Updates",
    "สถานะปัจจุบัน": "Current Status",
    "หมายเลขคิวของคุณ": "Your Queue Number",
    "คิวก่อนหน้าคุณ": "People Ahead",
    "คิวที่กำลังให้บริการขณะนี้": "Currently Serving",
    "คัดลอกลิงก์แชร์ให้ญาติ": "Copy Family Link",
    "คัดลอกลิงก์สำหรับญาติเรียบร้อย!": "Family link copied!",
    "รอเรียกเข้าห้องตรวจ": "Waiting",
    "กำลังให้บริการ": "Serving",
    "ให้บริการเสร็จแล้ว": "Completed",
    "ยกเลิกคิว": "Cancelled",
    "จุดลงทะเบียนออกคิว": "Queue Registration",
    "ออกคิวผู้ป่วยใหม่": "Register New Queue",
    "ชื่อ - นามสกุล ผู้ป่วย": "Patient Full Name",
    "กรอกชื่อ-นามสกุล...": "Enter full name...",
    "เลือกแผนก / บริการ": "Select Department / Service",
    "บันทึกข้อมูล & พิมพ์สลิปคิว": "Save & Print Queue Ticket",
    "คิวล่าสุดที่เพิ่งออกไป": "Most Recent Queue",
    "ประวัติการออกคิววันนี้": "Today's Queue History",
    "เลขคิว": "Queue No.",
    "ชื่อผู้ป่วย": "Patient Name",
    "สถานะ": "Status",
    "เวลา": "Time",
    "บัตรคิวรับบริการ": "Queue Ticket",
    "แผนกบริการ": "Service Department",
    "สแกนเพื่อติดตามสถานะคิวบนมือถือ": "Scan to track your queue on your phone",
    "กรุณารอฟังประกาศเรียกคิว": "Please wait for your queue to be called",
    "รอเรียก": "Waiting",
        "ลงทะเบียนออกคิว": "Queue Registration",
    "ออกคิวผู้ป่วยใหม่": "Register New Queue",
    "ชื่อผู้ป่วย": "Patient Name",
    "ชื่อ - นามสกุล ผู้ป่วย": "Patient Full Name",
    "กรอกชื่อผู้ป่วย": "Enter patient name",
    "เลือกแผนก / บริการ": "Select Department / Service",
    "เลือกแผนก": "Select Department",
    "บันทึกข้อมูล & พิมพ์สลิปคิว": "Save & Print Queue Ticket",
    "คิวล่าสุดที่เพิ่งออกไป": "Most Recent Queue",
    "ประวัติการออกคิววันนี้": "Today's Queue History",
    "เลขคิว": "Queue No.",
    "สถานะ": "Status",
    "เวลา": "Time",
    "บัตรคิวรับบริการ": "Queue Ticket",
    "แผนกบริการ": "Service Department",
    "สแกนเพื่อติดตามสถานะคิวบนมือถือ": "Scan to track your queue on your phone",
    "กรุณารอฟังประกาศเรียกคิว": "Please wait for your queue to be called",
    "รอเรียก": "Waiting",
    "กลับหน้าหลัก": "Back to Home",
    "ติดตามคิวบริการ": "Queue Tracking",
    "อัปเดตสดแบบเรียลไทม์": "Live Updates",
    "เลือกแพ็กเกจบริการ": "Select Service Package",
    "ธรรมดา": "Standard",
    "โปร": "Pro",
    "หมายเลขคิวของคุณ": "Your Queue Number",
    "คิวก่อนหน้าคุณ": "People Ahead",
    "คิวที่กำลังให้บริการขณะนี้": "Currently Serving",
    "สถานะการติดตาม": "Tracking Status",
    "คัดลอกลิงก์แชร์ให้ญาติ": "Copy Family Link",
    "คัดลอกลิงก์สำหรับญาติเรียบร้อย! ✨": "Family link copied! ✨",
    "ไม่สามารถคัดลอกลิงก์ได้": "Unable to copy link.",
    "เกิดข้อผิดพลาด": "An error occurred.",
    "ไม่สามารถโหลดข้อมูลได้": "Unable to load data.",
    "แอปจะแจ้งเตือนเมื่อเหลืออีก 1 คิว": "You will be notified when one queue remains.",
    "คุณ": "Patient",
    "กำลังค้นหา...": "Searching...",
    "กรุณากรอกชื่อ-นามสกุลของผู้ป่วย": "Please enter the patient's full name.",
    "ไม่พบข้อมูลผู้ป่วย": "Patient not found.",
    "ผู้ป่วยรายนี้ยังไม่มี Token สำหรับติดตามคิว": "This patient does not have a queue tracking token.",
    
    // Nurse page - additional translations
    "สถานะระบบ:": "System Status:",
    "กำลังเชื่อมต่อ...": "Connecting...",
    "กำลังยืนยันตัวตน...": "Authenticating...",
    "พร้อมใช้งาน": "Ready",
    "ล็อกอินไม่สำเร็จ": "Login failed",
    "พยาบาลประจำการ": "Nurse on Duty",
    "จุดลงทะเบียนออกคิว": "Queue Registration",
    "ออกคิวผู้ป่วยใหม่": "Register New Queue",
    "ชื่อ - นามสกุล ผู้ป่วย": "Patient Full Name",
    "กรอกชื่อ-นามสกุล...": "Enter full name...",
    "เลือกแผนก / บริการ": "Select Department / Service",
    "บันทึกข้อมูล & พิมพ์สลิปคิว": "Save & Print Queue Ticket",
    "กำลังบันทึกข้อมูล...": "Saving...",
    "คิวล่าสุดที่เพิ่งออกไป": "Most Recent Queue",
    "หมายเลขคิวปัจจุบัน": "Current Queue Number",
    "ยังไม่มีการออกคิว": "No queue registered yet",
    "ข้อมูลจะถูกบันทึกลงฐานข้อมูลทันที และรันคิวต่อไปอัตโนมัติ": "Data will be saved immediately, and the next queue number will be generated automatically.",
    "ประวัติการออกคิววันนี้": "Today's Queue History",
    "เลขคิว": "Queue No.",
    "ชื่อผู้ป่วย": "Patient Name",
    "สถานะ": "Status",
    "เวลา": "Time",
    "ยังไม่มีข้อมูลคิว": "No queue data yet",
    "บัตรคิวรับบริการ": "Queue Ticket",
    "โรงพยาบาล QueueCare": "QueueCare Hospital",
    "หมายเลขคิวของคุณ": "Your Queue Number",
    "แผนกบริการ": "Service Department",
    "สแกนเพื่อติดตามสถานะคิวบนมือถือ": "Scan to track your queue on your phone",
    "กรุณารอฟังประกาศเรียกคิว": "Please wait for your queue to be called",
    "รอเรียก": "Waiting",
    "ออกคิวเมื่อเวลา:": "Registered at:",
    "กรุณาลองใหม่อีกครั้ง": "Please try again.",
    "เกิดข้อผิดพลาดในการออกคิว": "An error occurred while registering the queue.",
    "ไม่สามารถติดต่อเซิร์ฟเวอร์ได้ กรุณาเช็กการเชื่อมต่อ": "Cannot connect to the server. Please check your connection.",
    "ประวัติการออกคิววันนี้ (อัปเดตสด)": "Today's Queue History (Live Updates)",
    "พร้อมใช้งาน": "Available",
    "การแจ้งเตือนคุณหมอ/ญาติ": "Doctor/Family Notifications",
    "ระบบจะแจ้งเตือนเมื่อใกล้ถึงคิว": "You will be notified when your queue is approaching",
    "เปิดใช้งานแล้ว": "Enabled",
    "ปิดใช้งานแล้ว": "Disabled",
    "รอเรียกเข้าห้องตรวจ": "Waiting",
    "คิว": "Queue",
    "อัปเดตสด": "Live Updates",
    "กลับหน้าหลัก": "Back to Home",
    "อัปเดตสดแบบเรียลไทม์": "Live Updates",
    "ผู้ป่วยรับบริการ / คุณ": "Patient",
    "ธรรมดา": "Standard",
    "หมายเลขคิวของคุณ": "Your Queue Number",
    "สถานะปัจจุบัน": "Current Status",
    "กำลังให้บริการ": "Serving",
    "คิวก่อนหน้าคุณ": "People Ahead",
    "คิว": "Queue",
    "การแจ้งเตือนคุณหมอ/ญาติ": "Doctor/Family Notifications",
    "ระบบจะแจ้งเตือนเมื่อใกล้ถึงคิว": "You will be notified when your queue is approaching",
    "เปิดใช้งานแล้ว": "Enabled",
    "ปิดใช้งานแล้ว": "Disabled",
    "คิวที่กำลังให้บริการขณะนี้": "Currently Serving",
    "สถานะการติดตาม:": "Tracking Status:",
    "แจ้งเตือนเมื่อเหลืออีก 1 คิว": "You will be notified when 1 queue remains",
    "กรุณารอเรียกเข้าห้องตรวจ": "Please wait for your queue to be called"


  };

  let currentLanguage =
    localStorage.getItem(STORAGE_KEY) || "th";

  function translateText(text, language) {
    if (!text) return text;

    const entries = Object.entries(translations)
      .sort((a, b) => b[0].length - a[0].length);

    if (language === "en") {
      for (const [thai, english] of entries) {
        text = text.split(thai).join(english);
      }
    } else {
      const reverseEntries = entries
        .map(([thai, english]) => [english, thai])
        .sort((a, b) => b[0].length - a[0].length);

      for (const [english, thai] of reverseEntries) {
        text = text.split(english).join(thai);
      }
    }

    return text;
  }

  function translatePage(language) {
    if (language !== "th" && language !== "en") return;

    currentLanguage = language;
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;

    document.querySelectorAll("body *").forEach((element) => {
      // แปลเฉพาะข้อความตรงใน element
      // ไม่แก้ข้อความของ element ที่มีลูก เพื่อป้องกันโครงสร้าง HTML พัง
      for (const node of element.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          if (!node.__queueCareOriginal) {
            node.__queueCareOriginal = node.nodeValue;
          }

          node.nodeValue = translateText(
            node.__queueCareOriginal,
            language
          );
        }
      }

      // แปล placeholder ของช่องกรอกข้อมูล
      if (element.hasAttribute("placeholder")) {
        if (!element.hasAttribute("data-qc-original-placeholder")) {
          element.setAttribute(
            "data-qc-original-placeholder",
            element.getAttribute("placeholder")
          );
        }

        element.setAttribute(
          "placeholder",
          translateText(
            element.getAttribute("data-qc-original-placeholder"),
            language
          )
        );
      }

      // แปล title ที่แสดงเมื่อเอาเมาส์ชี้
      if (element.hasAttribute("title")) {
        if (!element.hasAttribute("data-qc-original-title")) {
          element.setAttribute(
            "data-qc-original-title",
            element.getAttribute("title")
          );
        }

        element.setAttribute(
          "title",
          translateText(
            element.getAttribute("data-qc-original-title"),
            language
          )
        );
      }
    });

    const thaiButton = document.getElementById("qc-lang-th");
    const englishButton = document.getElementById("qc-lang-en");

    if (thaiButton) {
      thaiButton.style.background =
        language === "th" ? "#ffffff" : "#166534";
      thaiButton.style.color =
        language === "th" ? "#166534" : "#ffffff";
    }

    if (englishButton) {
      englishButton.style.background =
        language === "en" ? "#ffffff" : "#166534";
      englishButton.style.color =
        language === "en" ? "#166534" : "#ffffff";
    }
  }

  function addSwitcher() {
    if (document.getElementById("queuecare-language-switcher")) return;

    const box = document.createElement("div");
    box.id = "queuecare-language-switcher";
    box.style.cssText = [
      "position:fixed",
      "top:12px",
      "right:12px",
      "z-index:99999",
      "display:flex",
      "gap:4px",
      "background:#2D6A4F",
      "padding:5px",
      "border-radius:12px",
      "box-shadow:0 2px 8px rgba(0,0,0,.12)"
    ].join(";");

    [
      ["th", "ไทย", "qc-lang-th"],
      ["en", "EN", "qc-lang-en"]
    ].forEach(([language, label, id]) => {
      const button = document.createElement("button");

      button.id = id;
      button.type = "button";
      button.textContent = label;
      button.setAttribute("aria-label", label);
      button.style.cssText =
        "border:0;border-radius:8px;padding:7px 12px;" +
        "font-weight:bold;cursor:pointer;";

      button.addEventListener("click", () => {
        translatePage(language);
      });

      box.appendChild(button);
    });

    document.body.appendChild(box);
  }

  function start() {
    addSwitcher();
    translatePage(currentLanguage);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  window.QueueCareI18n = {
    setLanguage: translatePage,
    getLanguage: () => currentLanguage,
    translateText: (text) => translateText(text, currentLanguage)
  };
})();