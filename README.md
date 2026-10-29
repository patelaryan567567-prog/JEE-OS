# JEE OS / StudyOS

JEE OS is a local-first React workspace for Class 11–12 students preparing for the JEE. It combines planning, timers, subject and chapter tracking, practice records, reminders, analytics, backups, and an optional Gemini-powered study assistant. The package name and much of the UI refer to the product as **StudyOS**.

## Features

- Dashboard; task, lecture, question-practice, subject, backlog, reminder, analytics, and settings views.
- Study timer, XP/streak-style progress data, chapter tracking, and a structured local data store backed by IndexedDB.
- Exportable `.studyos` backups with validation, legacy migration, merge support, and explicit omission of API keys.
- AI chat with selectable personas, uploaded image/document support, Markdown/math rendering, contextual study data, and client-side execution of supported planner actions.
- An Express development/production server that proxies Gemini calls and exposes a health endpoint.
- Electron configuration for a Windows NSIS installer.

## Technology

- React 19, TypeScript, Vite 8, Tailwind CSS, and Motion.
- Express, `@google/genai`, and Mammoth for the server-side AI/document path.
- Electron and electron-builder for the Windows desktop package.

## Prerequisites

- Node.js and npm. Use versions compatible with the lockfile and the packages declared in `package.json`.
- A Gemini API key only if you want to use AI features.

## Run in development

```bash
npm install
npm run dev
```

`npm run dev` starts `server.ts` through `tsx`; the server serves the Vite application and its API routes. By default it uses port `3000`, unless `PORT` is set.

## Configuration

Copy `.env.example` to `.env.local` (or another dotenv-readable environment file) when required:

```env
GEMINI_API_KEY=your_gemini_api_key
APP_URL=http://localhost:3000
PORT=3000
NODE_ENV=development
```

- `GEMINI_API_KEY` is optional at startup but required for server-side AI requests unless a user enters a key in the app’s API Settings.
- `APP_URL` is documented by the project for hosted/callback-style use; the current server also reads `PORT` and `NODE_ENV`.
- API keys should remain in local/deployment secrets and must not be committed.

## Build and package

| Command | Purpose |
| --- | --- |
| `npm run build` | Build the Vite web app. |
| `npm run lint` | Type-check with `tsc --noEmit`. |
| `npm run preview` | Preview the web build. |
| `npm run build:desktop` | Build the web app and bundled Electron server output. |
| `npm run dist:win` | Create the Windows x64 NSIS installer. |
| `npm run clean` | Remove generated build/release directories. |

On Windows, run:

```powershell
npm install
npm run dist:win
```

The installer configuration produces `release-jeeos/JEE-OS-Setup-<version>.exe`, creates Start Menu and desktop shortcuts, and does not require Node.js after installation.

## Limitations and data notes

- AI functionality requires a network connection and a valid Gemini key; availability, quotas, and model access are controlled by Google.
- The project has no automated test suite in the repository. Use the type check/build commands as the available verification steps.
- Study data is designed to be local-first. Use the backup feature before moving devices or making destructive changes.
- The assistant can propose and execute supported local planner actions, but it is not a substitute for verified academic or exam advice.

