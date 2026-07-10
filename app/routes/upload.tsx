import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/upload";
import Navbar from "../components/Navbar";
import FileUploader from "../components/FileUploader";
import { usePuterStore } from "~/lib/puter";
import { convertPdfToImage } from "~/lib/pdf2img";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Resumind — Upload Resume" },
    {
      name: "description",
      content: "Upload your resume for AI-powered feedback",
    },
  ];
}

type UploadStatus =
  | "idle"
  | "uploading"
  | "converting"
  | "analyzing"
  | "complete"
  | "error";

const STATUS_TEXT: Record<UploadStatus, string> = {
  idle: "",
  uploading: "Uploading the file…",
  converting: "Converting to image…",
  analyzing: "Analyzing…",
  complete: "Upload successful",
  error: "Something went wrong. Please try again.",
};

export default function Upload() {
  const navigate = useNavigate();
  const { auth, isLoading, init, fs } = usePuterStore();

  // Form state
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Processing state
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize Puter SDK on mount
  useEffect(() => {
    init();
  }, [init]);

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated) {
      navigate("/auth?next=/upload", { replace: true });
    }
  }, [isLoading, auth.isAuthenticated, navigate]);

  const isProcessing = status !== "idle" && status !== "error";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) return;

    try {
      // Step 1: Upload the raw PDF
      setStatus("uploading");
      const pdfResult = await fs.upload(selectedFile);
      console.log("PDF upload result:", pdfResult);

      // Step 2: Convert PDF to image
      setStatus("converting");
      const { imageFile, error: convertError } =
        await convertPdfToImage(selectedFile);

      if (!imageFile) {
        setErrorMessage(convertError ?? "Failed to convert PDF to image.");
        setStatus("error");
        return;
      }

      // Step 3: Upload the converted image
      setStatus("uploading");
      const imageResult = await fs.upload(imageFile);
      console.log("Image upload result:", imageResult);

      // Step 4: AI analysis (next phase — placeholder for now)
      setStatus("complete");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Upload failed.";
      setErrorMessage(message);
      setStatus("error");
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-dark-200 text-lg animate-pulse">Loading…</p>
      </main>
    );
  }

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
      <Navbar />

      <section className="main-section">
        <div className="page-heading">
          <h1>Upload your Resume</h1>
          <h2>
            Get AI-powered feedback to improve your resume and land your
            dream job
          </h2>
        </div>

        {/* ---------- Processing state ---------- */}
        {isProcessing ? (
          <div className="flex flex-col items-center gap-6 py-10">
            <img
              src="/images/resume-scan.gif"
              alt="Scanning resume"
              className="w-64 h-64 object-contain rounded-2xl"
            />
            <p className="text-dark-200 text-lg font-medium animate-pulse">
              {STATUS_TEXT[status]}
            </p>
          </div>
        ) : (
          /* ---------- Upload form ---------- */
          <form
            onSubmit={handleSubmit}
            className="gradient-border w-full max-w-2xl"
          >
            <div className="form-div">
              <label htmlFor="companyName">Company Name</label>
              <input
                id="companyName"
                type="text"
                placeholder="e.g. Google"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            <div className="form-div">
              <label htmlFor="jobTitle">Job Title</label>
              <input
                id="jobTitle"
                type="text"
                placeholder="e.g. Frontend Developer"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>

            <div className="form-div">
              <label htmlFor="jobDescription">Job Description</label>
              <textarea
                id="jobDescription"
                placeholder="Paste the job description here (optional)"
                rows={4}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>

            <div className="form-div">
              <label>Resume (PDF)</label>
              <FileUploader onFileSelect={setSelectedFile} />
            </div>

            {status === "error" && errorMessage && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <img
                  src="/icons/warning.svg"
                  alt="Error"
                  className="w-4 h-4"
                />
                <p>{errorMessage}</p>
              </div>
            )}

            <button
              type="submit"
              className="primary-button"
              disabled={!selectedFile || isProcessing}
            >
              Upload &amp; Analyze
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
