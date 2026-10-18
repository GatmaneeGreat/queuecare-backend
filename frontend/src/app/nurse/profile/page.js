"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const PHOTO_KEY = "queuecare_nurse_profile_photo";

// Look for common token keys used by login systems.
function getAuthToken() {
  if (typeof window === "undefined") return null;

  const keys = [
    "queuecare_token",
    "access_token",
    "accessToken",
    "token",
    "authToken",
  ];

  for (const storage of [localStorage, sessionStorage]) {
    for (const key of keys) {
      const value = storage.getItem(key);
      if (value) {
        try {
          const parsed = JSON.parse(value);
          if (typeof parsed === "string") return parsed;
          if (parsed?.access_token) return parsed.access_token;
          if (parsed?.token) return parsed.token;
        } catch {
          return value;
        }
      }
    }
  }

  return null;
}

export default function NurseProfilePage() {
  const [profile, setProfile] = useState(null);
  const [photo, setPhoto] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [photoMessage, setPhotoMessage] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    try {
      setPhoto(localStorage.getItem(PHOTO_KEY) || "");
    } catch {
      // Keep the default avatar if local storage is unavailable.
    }
  }, []);

  useEffect(() => {
    async function loadProfile() {
      try {
        if (!API_URL) {
          throw new Error(
            "Backend URL is not configured. Check NEXT_PUBLIC_API_URL."
          );
        }

        const token = getAuthToken();
        const headers = {};

        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}/auth/me`, {
          method: "GET",
          headers,
          credentials: "include",
          cache: "no-store",
        });

        if (response.status === 401) {
          throw new Error(
            "Login session was not accepted. Please sign in again, or check the token key used by your login page."
          );
        }

        if (!response.ok) {
          throw new Error(`Unable to load profile (HTTP ${response.status}).`);
        }

        const data = await response.json();
        setProfile(data);
      } catch (err) {
        setError(err.message || "Unable to connect to the server.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  const fullName =
    profile?.name ||
    profile?.full_name ||
    profile?.username ||
    "Nurse";

  const email = profile?.email || "Not provided";
  const position = profile?.position || profile?.role || "Nurse";
  const hospitalName =
    profile?.hospital?.name ||
    profile?.hospital_name ||
    profile?.hospital?.hospital_name ||
    "Not assigned";

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoMessage("Please select an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setPhotoMessage("Image must be smaller than 2 MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const imageData = reader.result;
        localStorage.setItem(PHOTO_KEY, imageData);
        setPhoto(imageData);
        setPhotoMessage("Profile photo saved on this browser.");
      } catch {
        setPhotoMessage("Unable to save the photo. Please try a smaller image.");
      }
    };

    reader.onerror = () => {
      setPhotoMessage("Unable to read this image. Please try another.");
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function removePhoto() {
    try {
      localStorage.removeItem(PHOTO_KEY);
      setPhoto("");
      setPhotoMessage("Profile photo removed.");
    } catch {
      setPhotoMessage("Unable to remove the saved photo.");
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <main className="min-h-screen bg-[#f0f7f5] px-4 py-8 text-slate-800 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/nurse"
          className="mb-6 inline-flex items-center gap-2 rounded-xl px-3 py-2 font-semibold text-[#087f72] transition hover:bg-[#e0f2ed]"
        >
          <span aria-hidden="true">←</span>
          Back to Dashboard
        </Link>

        <section className="overflow-hidden rounded-3xl border border-[#dcebe7] bg-white shadow-sm">
          <header className="bg-[#087f72] px-6 py-8 text-white sm:px-8">
            <p className="text-sm font-medium tracking-widest text-white/80">
              QUEUECARE
            </p>
            <h1 className="mt-2 text-3xl font-bold">Nurse Profile</h1>
            <p className="mt-2 text-sm text-white/80">
              Your personal and work information
            </p>
          </header>

          <div className="p-6 sm:p-8">
            {loading ? (
              <p className="py-10 text-center text-slate-500">
                Loading profile...
              </p>
            ) : error ? (
              <div className="rounded-xl bg-red-50 p-5 text-center">
                <h2 className="font-semibold text-red-700">
                  Unable to Load Profile
                </h2>
                <p className="mt-2 break-words text-sm text-red-600">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-4 rounded-lg bg-[#087f72] px-4 py-2 font-semibold text-white hover:bg-[#06665c]"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <>
                <div className="mb-8 flex flex-col items-center border-b border-slate-100 pb-8">
                  <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-[#e0f2ed] bg-[#e0f2ed] text-4xl font-bold text-[#087f72]">
                    {photo ? (
                      <img
                        src={photo}
                        alt="Nurse profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      fullName.charAt(0).toUpperCase()
                    )}
                  </div>

                  <h2 className="mt-4 text-2xl font-bold">{fullName}</h2>

                  <span className="mt-2 rounded-full bg-[#e0f2ed] px-4 py-1 text-sm font-semibold text-[#087f72]">
                    {position}
                  </span>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />

                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl bg-[#087f72] px-5 py-3 text-sm font-semibold text-white hover:bg-[#06665c]"
                    >
                      {photo ? "Change Photo" : "Upload Photo"}
                    </button>

                    {photo && (
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>

                  <p className="mt-3 text-xs text-slate-400">
                    Image files only · Maximum 2 MB
                  </p>

                  {photoMessage && (
                    <p role="status" className="mt-2 text-center text-sm text-[#087f72]">
                      {photoMessage}
                    </p>
                  )}
                </div>

                <h3 className="mb-4 text-lg font-bold">
                  Personal Information
                </h3>

                <div className="space-y-3">
                  <ProfileItem label="Full Name" value={fullName} />
                  <ProfileItem label="Email Address" value={email} />
                  <ProfileItem label="Position" value={position} />
                  <ProfileItem label="Hospital" value={hospitalName} />
                  <ProfileItem label="Account Role" value={profile?.role || "Nurse"} />
                </div>

                <p className="mt-6 text-xs text-slate-400">
                  Your account information is retrieved from QueueCare.
                </p>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function ProfileItem({ label, value }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="break-words font-semibold text-slate-800 sm:text-right">
        {value}
      </span>
    </div>
  );
}