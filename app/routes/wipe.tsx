import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import type { Route } from "./+types/wipe";
import Navbar from "../components/Navbar";
import { usePuterStore } from "~/lib/puter";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Resumind — Wipe Data" },
    {
      name: "description",
      content: "Delete all your resume data from Resumind",
    },
  ];
}

// ---------------------------------------------------------------------------
// Types (minimal, matching the KV-stored shape)
// ---------------------------------------------------------------------------
interface StoredResume {
  id: string;
  imagePath?: string;
  resumePath?: string;
}

type WipeStatus = "idle" | "loading" | "confirming" | "wiping" | "done" | "error";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function Wipe() {
  const navigate = useNavigate();
  const { auth, isLoading, init, kv, fs } = usePuterStore();

  const [status, setStatus] = useState<WipeStatus>("idle");
  const [resumeCount, setResumeCount] = useState<number>(0);
  const [resumeKeys, setResumeKeys] = useState<string[]>([]);
  const [wipedCount, setWipedCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize Puter SDK on mount
  useEffect(() => {
    init();
  }, [init]);

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated) {
      navigate("/auth?next=/wipe", { replace: true });
    }
  }, [isLoading, auth.isAuthenticated, navigate]);

  // Fetch resume count once authenticated
  useEffect(() => {
    if (isLoading || !auth.isAuthenticated) return;

    let cancelled = false;

    async function fetchResumeCount() {
      try {
        setStatus("loading");
        const allKeys = await kv.list();
        const keys = allKeys.filter((k: string) => k.startsWith("resume:"));
        if (!cancelled) {
          setResumeKeys(keys);
          setResumeCount(keys.length);
          setStatus("idle");
        }
      } catch (err) {
        console.error("Failed to fetch resume keys:", err);
        if (!cancelled) {
          setStatus("error");
          setErrorMessage("Failed to load resume data.");
        }
      }
    }

    fetchResumeCount();
    return () => {
      cancelled = true;
    };
  }, [isLoading, auth.isAuthenticated, kv]);

  // ---------------------------------------------------------------------------
  // Wipe logic
  // ---------------------------------------------------------------------------
  const handleDeleteClick = () => {
    setStatus("confirming");
  };

  const handleCancel = () => {
    setStatus("idle");
  };

  const handleConfirmDelete = async () => {
    setStatus("wiping");
    setErrorMessage(null);

    let deleted = 0;

    for (const key of resumeKeys) {
      try {
        const raw = await kv.get(key);
        if (raw) {
          const parsed: StoredResume =
            typeof raw === "string" ? JSON.parse(raw) : (raw as StoredResume);

          // Delete the image file from Puter FS
          if (parsed.imagePath) {
            try {
              await fs.delete(parsed.imagePath);
            } catch {
              // File may already be missing — continue
            }
          }

          // Delete the PDF file from Puter FS
          if (parsed.resumePath) {
            try {
              await fs.delete(parsed.resumePath);
            } catch {
              // File may already be missing — continue
            }
          }
        }

        // Delete the KV entry itself
        await kv.delete(key);
        deleted++;
      } catch (err) {
        console.error(`Failed to wipe ${key}:`, err);
        // Continue with remaining entries
      }
    }

    setWipedCount(deleted);
    setResumeCount(0);
    setResumeKeys([]);
    setStatus("done");
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-dark-200 text-lg animate-pulse">Loading…</p>
      </main>
    );
  }

  const user = auth.user;

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
      <Navbar />

      <section className="main-section">
        <div className="page-heading">
          <h1>Wipe App Data</h1>
          <h2>Permanently delete all your resume data</h2>
        </div>

        {/* Content card */}
        <div
          className="w-full max-w-xl bg-white rounded-2xl p-8 shadow-md border border-gray-100"
          style={{ animation: "fadeIn 0.4s ease-out" }}
        >
          {/* User info */}
          {user && (
            <div className="flex items-center gap-4 pb-6 mb-6 border-b border-gray-100">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-lg font-bold shrink-0">
                {(user.username?.[0] ?? "U").toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-800">
                  {user.username}
                </p>
                {user.email && (
                  <p className="text-sm text-dark-200">{user.email}</p>
                )}
              </div>
            </div>
          )}

          {/* ---- Idle / Loading state ---- */}
          {(status === "idle" || status === "loading") && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-dark-200">Stored resumes</span>
                <span className="text-xl font-bold text-gray-800">
                  {status === "loading" ? (
                    <span className="animate-pulse">…</span>
                  ) : (
                    resumeCount
                  )}
                </span>
              </div>

              {resumeCount > 0 ? (
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  className="w-full py-3 px-6 rounded-full font-semibold text-white cursor-pointer transition-all duration-200"
                  style={{
                    background:
                      "linear-gradient(to bottom, #ef4444, #dc2626)",
                    boxShadow: "0 2px 8px rgba(239, 68, 68, 0.35)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "linear-gradient(to bottom, #dc2626, #b91c1c)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "linear-gradient(to bottom, #ef4444, #dc2626)";
                  }}
                >
                  🗑️ Delete All Resume Data
                </button>
              ) : (
                <p className="text-center text-dark-200 text-sm">
                  No resume data to delete.
                </p>
              )}
            </div>
          )}

          {/* ---- Confirmation step ---- */}
          {status === "confirming" && (
            <div className="flex flex-col gap-5">
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <img
                  src="/icons/warning.svg"
                  alt="Warning"
                  className="w-5 h-5 mt-0.5 shrink-0"
                />
                <div>
                  <p className="font-semibold text-red-700">
                    Are you sure?
                  </p>
                  <p className="text-sm text-red-600 mt-1">
                    This will permanently delete{" "}
                    <strong>{resumeCount}</strong>{" "}
                    resume{resumeCount !== 1 ? "s" : ""}, including all
                    uploaded files and AI feedback. This action cannot be
                    undone.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 py-3 px-6 rounded-full font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 cursor-pointer transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 py-3 px-6 rounded-full font-semibold text-white cursor-pointer transition-all duration-200"
                  style={{
                    background:
                      "linear-gradient(to bottom, #dc2626, #b91c1c)",
                    boxShadow: "0 2px 8px rgba(220, 38, 38, 0.4)",
                  }}
                >
                  Yes, Delete Everything
                </button>
              </div>
            </div>
          )}

          {/* ---- Wiping in progress ---- */}
          {status === "wiping" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-10 h-10 border-4 border-red-200 border-t-red-500 rounded-full animate-spin" />
              <p className="text-dark-200 text-lg animate-pulse">
                Deleting resume data…
              </p>
            </div>
          )}

          {/* ---- Done ---- */}
          {status === "done" && (
            <div className="flex flex-col items-center gap-5 py-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-50">
                <img
                  src="/icons/check.svg"
                  alt="Success"
                  className="w-8 h-8"
                />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-800">
                  All data wiped
                </p>
                <p className="text-sm text-dark-200 mt-1">
                  Successfully deleted{" "}
                  <strong>{wipedCount}</strong>{" "}
                  resume{wipedCount !== 1 ? "s" : ""} and their associated
                  files.
                </p>
              </div>

              <Link
                to="/"
                className="primary-button text-center mt-2 w-fit px-8"
              >
                ← Back to Home
              </Link>
            </div>
          )}

          {/* ---- Error ---- */}
          {status === "error" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <img
                  src="/icons/warning.svg"
                  alt="Error"
                  className="w-4 h-4"
                />
                <p>{errorMessage}</p>
              </div>
              <Link
                to="/"
                className="primary-button text-center w-fit px-8"
              >
                ← Back to Home
              </Link>
            </div>
          )}
        </div>

        {/* Always-visible back link */}
        {status !== "done" && status !== "error" && (
          <Link
            to="/"
            className="text-dark-200 text-sm hover:underline mt-2"
          >
            ← Back to Home
          </Link>
        )}
      </section>
    </main>
  );
}
