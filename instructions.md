# Setup & Deployment Instructions — iPhone/iPad + Safari only

**Revision note (Correction Spec #1):** the previous version of this file
told you to run scripts "from a machine with normal network access" —
that assumed a desktop/laptop, which contradicts the Device Constraint
(iPhone + iPad only). This version replaces that with a path that runs
entirely through two web dashboards (GitHub, Cloudflare) opened in Safari.
No terminal, no CLI, no desktop/laptop, at any step.

**Why this shape:** I checked Cloudflare's docs before writing this (not
guessing) — the dashboard's drag-and-drop "Direct Upload" explicitly does
**not** support Pages Functions (the serverless endpoints these tests need);
that only works via the Wrangler CLI, which needs a terminal. The supported
CLI-free path is: connect a GitHub repo to Cloudflare Pages, and let
Cloudflare's own cloud build server run `npm install` / `npm run build` —
your device never runs any of that.

---

## What you'll end up with

A page at `https://<your-project>.pages.dev/diagnostics.html` with two
buttons: **"Test Meshy Connection"** and **"Test R2 Upload/Fetch
Round-Trip"**. Tapping each runs the real check *on Cloudflare's servers*
and shows you a pass/fail result on screen. Your iPhone/iPad never talks to
Meshy or R2 directly, and no API key ever reaches the browser — only
Cloudflare's edge does.

The main 3D viewer (already working — see the build report) also gets a
small "Diagnostics ->" link in the top-right corner once redeployed.

---

## Prerequisites (create if you don't have them — both are free, both via Safari)

- A GitHub account: github.com -> Sign up
- A Cloudflare account: dash.cloudflare.com -> Sign up
- The project files, unzipped: open `rocket-3d-pipeline-v1.zip` in the
  **Files app** on your iPhone/iPad — tapping a `.zip` file there extracts
  it automatically into a folder of the same name. You'll pick files out of
  that folder in Step 2 below.

Before relying on either service for anything beyond this pilot test,
check their current free-tier limits yourself in each dashboard — those
numbers change over time and I'm not going to assert a figure here that
might be stale by the time you read this.

---

## Step 1 — Create an empty GitHub repository

1. In Safari, go to github.com -> tap **+** -> **New repository**.
2. Name it (e.g. `rocket-3d-pipeline`), leave it empty (don't check "Add a
   README"), set visibility to whatever you prefer, tap **Create
   repository**.

---

## Step 2 — Upload the project files (file-picker based, no drag-and-drop needed)

GitHub's web uploader has a **"choose your files"** button that opens the
normal iOS file picker — this is reliable on Safari because it's a standard
file input, not a drag-and-drop zone (which is why the earlier drag-and-drop
approach was dropped). Do this once per folder below: type the URL directly
into Safari's address bar (replace `<user>` and `<repo>`), tap **"choose
your files"**, and in the picker navigate to that exact subfolder inside the
unzipped project in your Files app, select everything shown there, and tap
**Commit changes**.

| URL to open | Folder to select files from (in Files app) |
|---|---|
| `github.com/<user>/<repo>/upload/main/` | the project's root files (`.gitignore`, `index.html`, `instructions.md`, `package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.functions.json`, `vite.config.ts`) |
| `github.com/<user>/<repo>/upload/main/data` | `data/` |
| `github.com/<user>/<repo>/upload/main/functions/api` | `functions/api/` |
| `github.com/<user>/<repo>/upload/main/public` | `public/` (just `diagnostics.html`) |
| `github.com/<user>/<repo>/upload/main/public/models` | `public/models/` (the two `.glb` files) |
| `github.com/<user>/<repo>/upload/main/scripts` | `scripts/` |
| `github.com/<user>/<repo>/upload/main/src/procedural` | `src/procedural/` |
| `github.com/<user>/<repo>/upload/main/src/providers` | `src/providers/` |
| `github.com/<user>/<repo>/upload/main/src/storage` | `src/storage/` |
| `github.com/<user>/<repo>/upload/main/src/types` | `src/types/` |
| `github.com/<user>/<repo>/upload/main/src/validation` | `src/validation/` |
| `github.com/<user>/<repo>/upload/main/src/web` | `src/web/` |

(The `output/` folder is just local build staging — it's not needed on
GitHub since `public/models/` already has the same two files.)

10 upload steps total. Tedious but each one is a straightforward tap ->
pick files -> commit.

---

## Step 3 — Create the R2 bucket

1. Cloudflare dashboard -> **R2** (left sidebar) -> **Create bucket**.
2. Name it, e.g. `rocket-3d-assets`. Location/pricing defaults are fine for
   this pilot test — check the current free-tier limits shown on that page
   before going beyond pilot-scale usage.

---

## Step 4 — Create the Pages project, connected to your GitHub repo

1. Cloudflare dashboard -> **Workers & Pages** -> **Create** -> **Pages**
   tab -> **Connect to Git**.
2. Authorize Cloudflare's GitHub App, select the repo you created in Step 1.
3. Build settings:
   - Framework preset: **Vite** (or "None" — either works, since the build
     command below is explicit)
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Tap **Save and Deploy**. This first deploy will likely show the 3D
   viewer working (procedural parts) but the diagnostics buttons will fail
   — that's expected, because the env var and R2 binding from Steps 5–6
   haven't been added yet.

---

## Step 5 — Add the Meshy API key as an environment variable

1. In your new Pages project -> **Settings** -> **Environment variables**.
2. Add variable: name `MESHY_API_KEY`, value = your actual Meshy API key,
   type = **Secret** (encrypted). Apply to Production (and Preview if you
   want to test from preview deployments too).
3. Get the key itself from your Meshy account dashboard (meshy.ai) if you
   haven't already — that's a User action, not something I can do for you.

---

## Step 6 — Bind the R2 bucket to this Pages project

1. Same project -> **Settings** -> **Functions** -> **R2 bucket bindings**
   -> **Add binding**.
2. Variable name: `ROCKET_ASSETS` (must match exactly — this is the name
   used in `functions/api/r2-selftest.ts`).
3. R2 bucket: select the one you created in Step 3.
4. Save.

This uses Cloudflare's **native R2 binding**, not the S3-compatible API —
so no Access Key ID / Secret Access Key are needed anywhere in this path.
(The `src/storage/r2Client.ts` file with the S3-style client is still in
the repo as an alternative for later, if a different environment with
normal desktop/network access ever becomes available — but it's not part
of this deployment.)

---

## Step 7 — Redeploy so the new settings take effect

Environment variables and bindings only apply to *new* deployments. Go to
your project's **Deployments** tab -> find the latest one -> **"..."** menu
-> **Retry deployment** (or just re-open Step 2's upload URL for any one
file and re-commit it with no real change, which triggers a fresh build).

---

## Step 8 — Run the tests from Safari

1. Open `https://<your-project>.pages.dev/diagnostics.html` in Safari on
   your iPhone or iPad.
2. Tap **"Test Meshy Connection (test mode)"** — expect a JSON result with
   `"success": true` and a `providerTaskId`. If it fails, the message will
   say exactly why (missing key, wrong key, or a Meshy-side error) — see
   `functions/api/meshy-test.ts` for the exact error text produced in each
   case.
3. Tap **"Test R2 Upload/Fetch Round-Trip"** — expect a JSON result with
   `"success": true` and, for each of the two parts, matching
   `uploadedBytes` / `fetchedBytes` counts. If it fails, the message
   distinguishes a missing binding from a read/write failure — see
   `functions/api/r2-selftest.ts`.
4. While you're there: open `https://<your-project>.pages.dev/` (the main
   page) on the same device and confirm the 3D viewer rotates/zooms
   smoothly with touch — this is the one Acceptance Criterion from Build
   Spec v1 that specifically requires a real device, and this deployed URL
   is now reachable from that device without a separate dev server.

---

## What I could not verify myself

I don't have a physical iPhone/iPad, so I can't confirm this exact
sequence (especially the GitHub file-picker upload flow) is friction-free
end to end on real hardware — only that each individual mechanism involved
(standard HTML file-input picker, GitHub's Git-integrated Pages build,
Cloudflare's native R2 binding) is a supported, documented feature with no
CLI or desktop dependency. If any step behaves unexpectedly on your actual
device, that's useful signal to bring back to Chat A/Chat C rather than
something to work around silently.
