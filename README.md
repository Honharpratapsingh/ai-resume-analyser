# Resumind — AI-Powered Resume Analyzer

> Smart, actionable feedback for your resume — no backend, no API keys, no cost to you.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20App-6366f1?style=for-the-badge)](https://ai-resume-analyser-smoky.vercel.app)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://github.com/Honharpratapsingh/ai-resume-analyser)

---

## Features

- **Serverless authentication** via Puter.js — no backend, no API keys needed
- **Drag-and-drop PDF upload** with client-side file validation
- **Automatic PDF-to-image conversion** for AI vision analysis
- **AI-powered scoring across 5 categories**: ATS Compatibility, Tone & Style, Content, Structure, and Skills
- **Job-specific feedback** tailored to a given job title and description
- **Resume history dashboard** with score tracking across all submissions
- **Data management** — wipe all stored resumes and files in one click
- **Zero backend infrastructure** — all storage and AI costs are handled per-user via Puter's "User-Pays" model

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Router v7 |
| Language | TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS v4 |
| State Management | Zustand |
| Backend Services | Puter.js (auth, file storage, key-value store, AI) |
| PDF Processing | pdfjs-dist |
| Utilities | clsx, tailwind-merge |

## Architecture

This app has **no traditional backend server**. Puter.js provides authentication, file storage, a key-value database, and AI inference entirely from the client side. Each user's data and AI usage is isolated to their own Puter account — the app itself never touches a server, database, or API key.

```
Browser ←→ Puter.js SDK ←→ Puter Cloud (per-user storage, AI, auth)
```

## Getting Started

```bash
git clone https://github.com/Honharpratapsingh/ai-resume-analyser.git
cd ai-resume-analyser
npm install
npm run dev
```

> **Note:** No environment variables or API keys are required. The app authenticates each user directly with Puter at runtime.

## Project Structure

```
ai-resume-analyser/
├── app/
│   ├── components/
│   │   ├── FileUploader.tsx    # Drag-and-drop PDF upload widget
│   │   ├── Navbar.tsx          # Top navigation bar
│   │   └── ResumeCard.tsx      # Resume preview card for the dashboard
│   ├── constants/
│   │   └── index.ts            # AI prompt templates and instructions
│   ├── lib/
│   │   ├── pdf2img.ts          # Client-side PDF → image conversion
│   │   └── puter.ts            # Zustand store wrapping the Puter SDK
│   ├── routes/
│   │   ├── auth.tsx            # Sign-in page
│   │   ├── home.tsx            # Dashboard — resume list with scores
│   │   ├── resume.tsx          # Individual resume results & feedback
│   │   ├── upload.tsx          # Upload form + AI analysis pipeline
│   │   └── wipe.tsx            # Destructive data wipe utility
│   ├── app.css                 # Global styles, design tokens, utilities
│   ├── root.tsx                # App shell, Puter SDK script tag
│   └── routes.ts               # Route definitions
├── public/
│   ├── icons/                  # UI icons (SVG)
│   ├── images/                 # Static images and backgrounds
│   └── pdf.worker.min.mjs      # PDF.js web worker
├── types/
│   └── index.d.ts              # Global type declarations
├── react-router.config.ts
├── tsconfig.json
├── vite.config.ts
└── package.json
```

## Credits

Built by following the [JavaScript Mastery](https://www.youtube.com/@javascriptmastery) Resumind tutorial, with architectural guidance and debugging support throughout the build.
