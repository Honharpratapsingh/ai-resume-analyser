import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { usePuterStore } from "~/lib/puter";
import type { Route } from "./+types/auth";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Resumind — Sign In" },
    {
      name: "description",
      content: "Sign in to Resumind to analyze your resumes with AI",
    },
  ];
}

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next") || "/";

  const { auth, isLoading, error, init } = usePuterStore();
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Initialize Puter SDK on mount
  useEffect(() => {
    init();
  }, [init]);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && auth.isAuthenticated) {
      navigate(next, { replace: true });
    }
  }, [isLoading, auth.isAuthenticated, navigate, next]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await auth.signIn();
      navigate(next, { replace: true });
    } catch {
      // Error is set in the store
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[url('/images/bg-auth.svg')] bg-cover bg-center">
      <section className="flex flex-col items-center gap-10 text-center max-w-2xl px-6">
        <div className="flex flex-col items-center gap-4">
          <h1>
            Get your Resume <br /> Job-Ready!
          </h1>
          <h2>Smart feedback for your dream job</h2>
        </div>

        {error && (
          <p className="text-red-500 text-sm max-w-md">{error}</p>
        )}

        <button
          type="button"
          className="auth-button"
          onClick={handleSignIn}
          disabled={isLoading || isSigningIn}
        >
          {isLoading
            ? "Loading…"
            : isSigningIn
              ? "Signing in…"
              : "Log In"}
        </button>
      </section>
    </main>
  );
}
