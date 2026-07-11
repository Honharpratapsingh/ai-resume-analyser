import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { usePuterStore } from "~/lib/puter";

// ---------------------------------------------------------------------------
// Types — mirrors the stored resume shape from upload.tsx / constants
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

type ResumeCardProps = {
  resume: Resume;
};

/** Static fallback when the real thumbnail cannot be loaded. */
const FALLBACK_THUMB = "/images/pdf.png";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Score → badge colour classes (matches resume.tsx logic). */
function scoreBadgeClass(score: number): string {
  if (score >= 80) return "bg-badge-green text-badge-green-text";
  if (score >= 50) return "bg-badge-yellow text-badge-yellow-text";
  return "bg-badge-red text-badge-red-text";
}

/** Score → ring border colour (matches resume.tsx). */
function scoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const ResumeCard = ({ resume }: ResumeCardProps): React.JSX.Element => {
  const { fs } = usePuterStore();
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  // Track the current blob URL in a ref so we can always revoke the right one
  // on unmount, even if the state has been captured in a stale closure.
  const blobUrlRef = useRef<string | null>(null);

  const score = resume.feedback?.overallScore ?? 0;

  // Load the resume thumbnail from Puter FS
  useEffect(() => {
    if (!resume.imagePath) {
      setThumbUrl(FALLBACK_THUMB);
      return;
    }

    let cancelled = false;

    async function loadThumb() {
      try {
        const blob = await fs.read(resume.imagePath);

        // fs.read may resolve with a falsy / empty value in edge cases
        if (!blob || (blob instanceof Blob && blob.size === 0)) {
          if (!cancelled) setThumbUrl(FALLBACK_THUMB);
          return;
        }

        const url = URL.createObjectURL(blob);

        if (!cancelled) {
          // Revoke any previous blob URL before setting a new one
          if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current);
          }
          blobUrlRef.current = url;
          setThumbUrl(url);
        } else {
          // Component unmounted before we could use this URL — clean up
          URL.revokeObjectURL(url);
        }
      } catch {
        // fs.read failed — show the placeholder instead of using the raw
        // Puter internal path (which is NOT a valid browser URL).
        if (!cancelled) setThumbUrl(FALLBACK_THUMB);
      }
    }

    loadThumb();
    return () => {
      cancelled = true;
    };
  }, [resume.imagePath, fs]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  /** Safety-net: if the <img> itself fails to decode/load, swap to fallback. */
  const handleImgError = () => {
    setThumbUrl(FALLBACK_THUMB);
  };

  return (
    <Link to={`/resume/${resume.id}`} className="resume-card group shadow-md hover:shadow-lg transition-shadow duration-200">
      {/* Header — job info + score */}
      <div className="resume-card-header">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold text-gray-800 line-clamp-2">
            {resume.jobTitle || "Untitled Position"}
          </h3>
          {resume.companyName && (
            <p className="text-sm text-dark-200">{resume.companyName}</p>
          )}
        </div>

        {/* Score circle */}
        <div
          className="flex flex-col items-center justify-center w-14 h-14 rounded-full border-[3px] shrink-0"
          style={{ borderColor: scoreColor(score) }}
        >
          <span
            className="text-base font-bold leading-none"
            style={{ color: scoreColor(score) }}
          >
            {score}
          </span>
          <span className="text-[9px] text-dark-200 leading-none mt-0.5">
            /100
          </span>
        </div>
      </div>

      {/* Category badges row */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["ATS", resume.feedback?.ATS],
            ["Tone", resume.feedback?.toneAndStyle],
            ["Content", resume.feedback?.content],
            ["Structure", resume.feedback?.structure],
            ["Skills", resume.feedback?.skills],
          ] as [string, CategoryFeedback | undefined][]
        ).map(
          ([label, cat]) =>
            cat && (
              <span
                key={label}
                className={`score-badge text-xs font-medium ${scoreBadgeClass(cat.score)}`}
              >
                {label}: {cat.score}
              </span>
            ),
        )}
      </div>

      {/* Resume thumbnail */}
      <div className="flex-1 rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={`${resume.jobTitle} resume preview`}
            className="w-full h-full object-cover object-top"
            onError={handleImgError}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-dark-200 text-sm animate-pulse">
            Loading preview…
          </div>
        )}
      </div>
    </Link>
  );
};

export default ResumeCard;
export type { Resume };