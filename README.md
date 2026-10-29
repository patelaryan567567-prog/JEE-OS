<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# StudyOS

StudyOS is a local-first study planner for JEE students, with optional Gemini-powered AI features.

## Run in development

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. (Optional) Set `GEMINI_API_KEY` in `.env.local`, or add your key in StudyOS API Settings.
3. Start the app:
   `npm run dev`

## Build the Windows installer

On Windows, install dependencies and create the x64 NSIS installer:

```powershell
npm install
npm run dist:win
```

The installer is written to `release-jeeos/JEE-OS-Setup-1.0.0.exe`. It installs JEE OS as a desktop app and adds Start Menu and desktop shortcuts. Node.js is only needed to build the installer, not to use the installed app.

Gemini features remain optional. To use them, enter a Gemini API key in the app's API Settings; the key is not bundled into the installer.
