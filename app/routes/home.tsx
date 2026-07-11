import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/home";
import Navbar from "../components/Navbar";
import ResumeCard from "../components/ResumeCard";
import type { Resume } from "../components/ResumeCard";
import { usePuterStore } from "~/lib/puter";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Resumind" },
    {
      name: "description",
      content: "Smart feedback for your dream job",
    },
  ];
}

export default function Home() {
  const navigate = useNavigate();
  const { auth, isLoading, init, kv } = usePuterStore();

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(true);

  // Initialize Puter SDK on mount
  useEffect(() => {
    init();
  }, [init]);

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated) {
      navigate("/auth?next=/", { replace: true });
    }
  }, [isLoading, auth.isAuthenticated, navigate]);

  // Fetch all resumes from KV once authenticated
  useEffect(() => {
    if (isLoading || !auth.isAuthenticated) return;

    let cancelled = false;

    async function fetchAllResumes() {
      try {
        const allKeys = await kv.list();
        const resumeKeys = allKeys.filter((k: string) =>
          k.startsWith("resume:"),
        );

        const results: Resume[] = [];

        for (const key of resumeKeys) {
          try {
            const raw = await kv.get(key);
            if (!raw) continue;

            const parsed: Resume =
              typeof raw === "string" ? JSON.parse(raw) : (raw as Resume);

            if (parsed.id && parsed.feedback) {
              results.push(parsed);
            }
          } catch {
            // Skip malformed entries silently
          }
        }

        // Most recently uploaded first (UUIDs are random, so we just
        // reverse the insertion order which matches KV key order)
        results.reverse();

        if (!cancelled) setResumes(results);
      } catch (err) {
        console.error("Failed to fetch resumes:", err);
      } finally {
        if (!cancelled) setLoadingResumes(false);
      }
    }

    fetchAllResumes();
    return () => {
      cancelled = true;
    };
  }, [isLoading, auth.isAuthenticated, kv]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-dark-200 text-lg animate-pulse">Loading…</p>
      </main>
    );
  }

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">
      <Navbar />

      <section className="main-section">
        <div className="page-heading">
          <h1>Track your Applications &amp; Resume Ratings</h1>
          <h2>Review your submissions and check AI-powered feedback</h2>
        </div>

        <div className="resumes-section">
          {loadingResumes ? (
            <div className="flex flex-col items-center gap-4 py-20 w-full text-center">
              <p className="text-dark-200 text-lg animate-pulse">
                Loading your resumes…
              </p>
            </div>
          ) : resumes.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-20 w-full text-center">
              <img
                src="/icons/info.svg"
                alt="No resumes"
                className="w-12 h-12 opacity-60"
              />
              <p className="text-dark-200 text-lg">
                No resumes found. Upload your first resume to get feedback.
              </p>
            </div>
          ) : (
            resumes.map((resume) => (
              <ResumeCard key={resume.id} resume={resume} />
            ))
          )}
        </div>
      </section>
    </main>
  );
}