import { useEffect } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/home";
import Navbar from "../components/Navbar";
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
  const { auth, isLoading, init } = usePuterStore();

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
        </div>
      </section>
    </main>
  );
}