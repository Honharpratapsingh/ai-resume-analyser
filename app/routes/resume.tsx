import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router";
import type { Route } from "./+types/resume";
import Navbar from "../components/Navbar";
import { usePuterStore } from "~/lib/puter";

// ---------------------------------------------------------------------------
// Types — mirrors the AI response shape from constants/index.ts
// ---------------------------------------------------------------------------
interface Tip {
  type: "good" | "improve";
  tip: string;
  explanation?: string;
}

interface CategoryFeedback {
  score: number;
  tips: Tip[];
}

interface Feedback {
  overallScore: number;
  ATS: CategoryFeedback;
  toneAndStyle: CategoryFeedback;
  content: CategoryFeedback;
  structure: CategoryFeedback;
  skills: CategoryFeedback;
}

interface Resume {
  id: string;
  companyName: string;
  jobTitle: string;
  imagePath: string;
  resumePath: string;
  feedback: Feedback;
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------
export function meta(_: Route.MetaArgs) {
  return [
    { title: "Resumind — Resume Feedback" },
    {
      name: "description",
      content: "View AI-powered feedback for your resume",
    },
  ];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Maps a numeric score to a colour class for score badges. */
function scoreBadgeClass(score: number): string {
  if (score >= 80) return "bg-badge-green text-badge-green-text";
  if (score >= 50) return "bg-badge-yellow text-badge-yellow-text";
  return "bg-badge-red text-badge-red-text";
}

/** Returns the ATS-specific icon based on score range. */
function atsIcon(score: number): string {
  if (score >= 80) return "/icons/ats-good.svg";
  if (score >= 50) return "/icons/ats-warning.svg";
  return "/icons/ats-bad.svg";
}

/** Returns the generic tip icon (check or warning/cross). */
function tipIcon(type: "good" | "improve"): string {
  return type === "good" ? "/icons/check.svg" : "/icons/warning.svg";
}

/** Human-readable category labels. */
const CATEGORY_LABELS: Record<string, string> = {
  ATS: "ATS Compatibility",
  toneAndStyle: "Tone & Style",
  content: "Content",
  structure: "Structure",
  skills: "Skills",
};

const CATEGORY_KEYS = [
  "ATS",
  "toneAndStyle",
  "content",
  "structure",
  "skills",
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ResumePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { auth, isLoading, init, kv, fs } = usePuterStore();

  const [resume, setResume] = useState<Resume | null>(null);
  const [loadingResume, setLoadingResume] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Initialize Puter SDK
  useEffect(() => {
    init();
  }, [init]);

  // Auth guard
  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated) {
      navigate(`/auth?next=/resume/${id}`, { replace: true });
    }
  }, [isLoading, auth.isAuthenticated, navigate, id]);

  // Fetch resume data from KV
  useEffect(() => {
    if (isLoading || !auth.isAuthenticated || !id) return;

    let cancelled = false;

    async function fetchResume() {
      try {
        const raw = await kv.get(`resume:${id}`);
        if (!raw || cancelled) {
          if (!cancelled) setNotFound(true);
          return;
        }

        const parsed: Resume =
          typeof raw === "string" ? JSON.parse(raw) : (raw as Resume);

        if (!parsed.feedback) {
          if (!cancelled) setNotFound(true);
          return;
        }

        if (!cancelled) setResume(parsed);
      } catch (err) {
        console.error("Failed to load resume:", err);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoadingResume(false);
      }
    }

    fetchResume();
    return () => {
      cancelled = true;
    };
  }, [isLoading, auth.isAuthenticated, id, kv]);

  // Load the resume image from Puter FS
  useEffect(() => {
    if (!resume?.imagePath) return;

    let cancelled = false;

    async function loadImage() {
      try {
        const blob = await fs.read(resume!.imagePath);
        const url = URL.createObjectURL(blob);
        if (!cancelled) setImageUrl(url);
      } catch {
        // If fs.read fails, try using imagePath directly (might be a URL)
        if (!cancelled) setImageUrl(resume!.imagePath);
      }
    }

    loadImage();
    return () => {
      cancelled = true;
    };
  }, [resume, fs]);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (imageUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  // Derive the overall score ring colour
  const overallScoreColor = useMemo(() => {
    if (!resume) return "";
    const s = resume.feedback.overallScore;
    if (s >= 80) return "#22c55e";
    if (s >= 50) return "#f59e0b";
    return "#ef4444";
  }, [resume]);

  // ---- Loading states ----
  if (isLoading || loadingResume) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <img
            src="/images/resume-scan.gif"
            alt="Loading resume"
            className="w-48 h-48 object-contain rounded-2xl"
          />
          <p className="text-dark-200 text-lg font-medium animate-pulse">
            Loading your feedback…
          </p>
        </div>
      </main>
    );
  }

  // ---- Not found ----
  if (notFound || !resume) {
    return (
      <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
        <Navbar />
        <section className="main-section">
          <div className="flex flex-col items-center gap-6 py-20">
            <img
              src="/icons/warning.svg"
              alt="Not found"
              className="w-16 h-16 opacity-70"
            />
            <h2 className="text-2xl font-semibold text-gray-800">
              Resume not found
            </h2>
            <p className="text-dark-200 text-center max-w-md">
              We couldn't find a resume with this ID. It may have been deleted
              or the link is invalid.
            </p>
            <Link to="/" className="primary-button w-fit px-8">
              ← Back to Home
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const { feedback } = resume;

  // ---- Main content ----
  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
      <Navbar />

      <section className="resume-results-section">
        {/* ---------- LEFT COLUMN — Resume preview ---------- */}
        <aside className="resume-preview-col">
          <Link to="/" className="back-button w-fit">
            <img src="/icons/back.svg" alt="Back" className="w-4 h-4" />
            <span className="text-sm text-gray-700">Back to Home</span>
          </Link>

          {/* Job info */}
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold text-gray-800">
              {resume.jobTitle}
            </h3>
            {resume.companyName && (
              <p className="text-dark-200 text-sm">{resume.companyName}</p>
            )}
          </div>

          {/* Resume image card */}
          <div className="resume-image-card">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Resume preview"
                className="w-full h-auto rounded-xl"
              />
            ) : (
              <div className="flex items-center justify-center h-64 text-dark-200">
                <p>Image unavailable</p>
              </div>
            )}
          </div>
        </aside>

        {/* ---------- RIGHT COLUMN — Feedback ---------- */}
        <div className="feedback-section">
          {/* Overall score hero */}
          <div className="overall-score-card">
            <div className="overall-score-ring" style={{ borderColor: overallScoreColor }}>
              <span className="overall-score-number" style={{ color: overallScoreColor }}>
                {feedback.overallScore}
              </span>
              <span className="text-xs text-dark-200 -mt-1">/ 100</span>
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold text-gray-900">
                Overall Score
              </h2>
              <p className="text-dark-200 text-sm">
                {feedback.overallScore >= 80
                  ? "Great resume! A few tweaks will make it perfect."
                  : feedback.overallScore >= 50
                    ? "Decent foundation. Several areas need improvement."
                    : "Needs significant work. Follow the tips below."}
              </p>
            </div>
          </div>

          {/* Category summary bar */}
          <div className="resume-summary max-lg:flex-col">
            {CATEGORY_KEYS.map((key) => {
              const cat = feedback[key];
              return (
                <div key={key} className="category">
                  <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                    {CATEGORY_LABELS[key]}
                  </span>
                  <span
                    className={`score-badge text-sm font-semibold ${scoreBadgeClass(cat.score)}`}
                  >
                    {cat.score}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Category detail sections */}
          {CATEGORY_KEYS.map((key) => {
            const cat = feedback[key];
            const isATS = key === "ATS";

            return (
              <div key={key} className="category-detail-card">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isATS && (
                      <img
                        src={atsIcon(cat.score)}
                        alt="ATS"
                        className="w-10 h-10"
                      />
                    )}
                    <h3 className="text-lg font-semibold text-gray-800">
                      {CATEGORY_LABELS[key]}
                    </h3>
                  </div>
                  <span
                    className={`score-badge text-sm font-semibold ${scoreBadgeClass(cat.score)}`}
                  >
                    {cat.score} / 100
                  </span>
                </div>

                {/* Tips */}
                {cat.tips.length > 0 ? (
                  <ul className="flex flex-col gap-3 mt-4">
                    {cat.tips.map((tip, i) => (
                      <li key={i} className="tip-row">
                        <img
                          src={isATS ? atsIcon(cat.score) : tipIcon(tip.type)}
                          alt={tip.type}
                          className={`tip-icon ${tip.type === "good" ? "tip-icon-good" : "tip-icon-improve"}`}
                        />
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={`text-sm font-medium ${
                              tip.type === "good"
                                ? "text-green-800"
                                : "text-amber-800"
                            }`}
                          >
                            {tip.tip}
                          </span>
                          {tip.explanation && (
                            <span className="text-xs text-dark-200 leading-relaxed">
                              {tip.explanation}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-dark-200 mt-3 italic">
                    No tips for this category.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
