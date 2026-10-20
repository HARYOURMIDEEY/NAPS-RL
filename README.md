# NAPS FUTMinna Physics E-Learning Platform

Study materials, practice quizzes, timed examinations, a leaderboard and an AI
Physics tutor for FUTMinna Physics students (100 to 500 Level), with an admin
console for managing students and materials.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · Prisma +
PostgreSQL · Vercel Blob · Nodemailer (SMTP) · Anthropic API.

---

## Deploy to Vercel (step by step)

### 1. Put the code on GitHub
```bash
npm install            # creates package-lock.json, commit it
git init && git add . && git commit -m "Initial commit"
# create an empty GitHub repo, then:
git remote add origin <your-repo-url> && git push -u origin main
```
`.env` is git-ignored, so no secrets are committed.

### 2. Create a PostgreSQL database
Any Postgres works. Easiest options: **Neon** (via Vercel -> Storage -> Neon) or **Supabase**.
You need two connection strings:
- `DATABASE_URL`: the **pooled** string (used by the running app)
- `DIRECT_URL`: the **direct / non-pooled** string (used only by `prisma db push`).
  If your provider only gives one string, use it for both.

### 3. Import the project in Vercel
Vercel -> Add New -> Project -> pick the repo. Framework is detected as Next.js.
The build command (`prisma generate && next build`) is already set in `package.json`.

### 4. Add environment variables
Project -> Settings -> Environment Variables (see `.env.example` for all of them):

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | pooled Postgres URL |
| `DIRECT_URL` | yes | direct Postgres URL |
| `AUTH_SECRET` | yes | `openssl rand -base64 32` |
| `EMAIL_SERVER` / `EMAIL_FROM` | yes | SMTP (Resend, Brevo, Postmark, SendGrid...). Without it nobody can verify their account |
| `BLOB_READ_WRITE_TOKEN` | yes | create a **Blob** store under Storage and connect it to the project; Vercel injects this automatically |
| `AI_API_KEY` | for AI tutor | Anthropic API key |
| `AI_MODEL` | no | defaults to `claude-sonnet-5-5`; `claude-haiku-5-5` is cheaper |
| `APP_URL` | no | set after you add a custom domain; otherwise the Vercel URL is used |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | recommended | shared rate limiting (free tier is plenty) |

### 5. Create the tables and the Super Admin (once, from your computer)
```bash
npm i -g vercel && vercel link        # link this folder to the Vercel project
vercel env pull .env                  # downloads DATABASE_URL, DIRECT_URL, ...
npm run db:push                       # creates the tables
INITIAL_SUPER_ADMIN_PASSWORD="a-long-random-password" npm run db:seed
```
- Log in at `/admin/login` as `Haryourmidey` (or `SUPER_ADMIN_USERNAME`); you are **forced to change the password** immediately.
- The seed creates the PHY301/303/305/307 courses. Add `SEED_SAMPLE_DATA=true` to also create a demo quiz, exam and announcement (don't do that on the real production database).

### 6. Deploy and test
Push to `main` (or click Redeploy). Then run through the checklist below.

---

## Pre-launch checklist
- [ ] Register a test student -> receive the email code -> verify -> log in
- [ ] "Forgot password" email arrives and the link opens your **real domain** (not localhost)
- [ ] Upload a PDF larger than 5 MB as admin, then download it as a student
- [ ] AI tutor answers (confirms `AI_API_KEY` / `AI_MODEL`)
- [ ] Take a quiz; start an exam, refresh mid-exam (it should resume), submit
- [ ] Check the leaderboard shows your test student, then suspend/reactivate them in the admin console
- [ ] **Confirm the real FUTMinna matric number and student-email formats** in `lib/validation.ts` (currently lenient guesses, see below)
- [ ] Redeploy once Next.js ships its security update (see "Security" below)

---

## What changed in this review (so you know what you're deploying)

**Build / deployment blockers fixed**
- Added `prisma generate` to `postinstall` and `build` (Vercel caches dependencies; without this the build fails with an outdated-Prisma-client error).
- Upgraded **Next.js 14.2 -> 15.5**: 14.2 no longer receives security backports, and your login gate (`middleware.ts`) depends on it. Converted every route to Next 15's async `params` / `cookies()`.
- Fixed a TypeScript error in `lib/audit.ts` (`Record<string, unknown>` is not valid Prisma JSON) that would have failed `next build`.
- Added `.eslintrc.json`, a full `.gitignore`, `engines.node`, `DIRECT_URL` support for pooled databases, security headers, `robots.txt`, sitemap, favicon.
- The password-reset link used `http://localhost:3000` unless `APP_URL` was set; it now falls back to the Vercel URL automatically.

**Vercel-specific runtime bugs fixed**
- **File uploads over ~4.5 MB would have failed** (serverless request-body limit). Uploads now go straight from the browser to Vercel Blob (`/api/admin/materials/upload`), up to 50 MB.
- Rate limiting was per-instance memory (unreliable on serverless). It now uses Upstash Redis when configured, with a safe fallback.
- Email sending now has timeouts so it can't hang a function; AI calls have a 50 s timeout and `maxDuration = 60`.
- GET API routes are marked `force-dynamic` so database data is never cached.

**Functional bugs fixed**
- **Exam refresh lockout:** with `attemptLimit = 1`, refreshing during an exam blocked you from your own running attempt. Resume now works.
- **Auto-submit sent empty answers** (stale closure in the timer), so any student who ran out of time scored 0. Fixed.
- Auto-submit at the deadline was always marked "late/expired" (network delay), excluding it from the leaderboard. Added a 30 s grace window.
- The countdown now corrects for a wrong device clock using the server's time; `randomizeQuestions` was ignored and the answer shuffle was biased; both fixed.
- `revealAnswers` never actually revealed anything; exam results now show the review when enabled.
- Leaderboard: retaking a quiz repeatedly could farm points. Only your best score per quiz counts now. Weeks start on Monday in Nigerian time (WAT), and suspended users are excluded.
- AI tutor: the model name `claude-sonnet-5` was not an ID I could confirm; it now defaults to `claude-sonnet-5-5` (configurable via `AI_MODEL`). It now remembers earlier messages in the chat, and students can only continue **their own** conversations (previously any conversation ID worked). It no longer claims answers come "from platform material" (it only ever saw titles); related materials are shown honestly as suggestions.
- Forced password change for the Super Admin was only enforced in the browser; it is now enforced on the server for every API/page.
- Password reset/change accepted weaker passwords than registration; one shared policy now.
- Login no longer reveals which usernames exist (state checks run after the password check; constant-time dummy compare).
- Email templates escape user-supplied names (HTML injection) and are branded.
- Admin: materials can be deleted; the course list comes from the database; the admin console works on phones; students are searchable.

**Polish**
- Persistent sidebar/shell (no reload between pages), SVG icons instead of emoji, loading/empty/error states, 404 and error pages, proper metadata, accessibility labels, verify-code paste support, removal of developer notes that were visible to users.

---

## Known limitations (honest list)
- **Matric / student-email formats are unconfirmed.** `lib/validation.ts` accepts `YYYY/1/12345PP` and `YYYY/12345PP` style numbers and `@st.futminna.edu.ng` emails. Verify with the department before launch or real students may be rejected.
- **Files are publicly reachable by URL.** The installed `@vercel/blob` version only supports public blobs. Names are random and downloads go through a login-protected route, but anyone who obtains the raw URL can open the file. Don't upload anything that must stay confidential.
- **Not built yet:** admin screens to author quizzes/exams/questions/courses (use `npm run db:studio` or the seed for now), badges, notifications, scheduled leaderboard jobs. AI retrieval is keyword matching, not embeddings.
- Exam answers are saved only on submit; if a student closes the tab, they resume with a fresh answer sheet (the timer keeps running).
- Without Upstash configured, rate limiting is weak on Vercel (login lockout and OTP attempt limits are stored in the database and still work).

## Security
- Next.js announced an out-of-band security update for **14 October 2026**. After it ships, run `npm update next eslint-config-next`, commit, and redeploy. `package.json` pins `~15.5.0`, so this stays within 15.5.x.
- Never commit `.env`. Rotate `AUTH_SECRET` and API keys if they were ever shared.
- Change the Super Admin password on first login (enforced).

## Local development
```bash
npm install
cp .env.example .env     # fill in values
npm run db:push
INITIAL_SUPER_ADMIN_PASSWORD="long-random-password" SEED_SAMPLE_DATA=true npm run db:seed
npm run dev
```

## Branding
`#5C2D82` (`tailwind.config.ts`) is a placeholder academic purple, not an official FUTMinna value. Swap it if you have the real hex.



## Deploy without using a terminal

See [`NO-COMMAND-VERCEL-SETUP.md`](./NO-COMMAND-VERCEL-SETUP.md) for a browser-only Vercel + Neon setup. It uses a temporary `AUTO_DB_SETUP=true` setting for the initial schema sync and Super Admin seed. Disable it and remove the bootstrap password after the first successful deployment. Never leave initial setup enabled for routine production builds.

## Email verification codes

Student registration already creates a six-digit email verification code and sends it to the student's personal email. The code expires after 10 minutes, is stored as a hash, and is rate-limited. Login is blocked until the email is verified. Configure `EMAIL_SERVER` and `EMAIL_FROM` in local `.env` and Vercel Project Settings → Environment Variables. Use an SMTP provider such as Resend, Brevo, Postmark, or SendGrid; for production, verify your sending domain with the provider. Do not commit real credentials.

## Super Admin campaigns

The Super Admin console includes **Ads & campaigns**. Super Admins can publish a title, message, optional banner image, destination button, audience (all students or a level), start time, and optional end time. Active campaigns are displayed in the authenticated student interface and can be dismissed for the current page view. Image uploads use Vercel Blob and are limited to 5 MB. Configure `BLOB_READ_WRITE_TOKEN` in Vercel.

After updating the schema, run `npm run db:push` locally or as a controlled deployment step to create the `Campaign` table. Then redeploy the application. The campaign API is Super Admin-only; normal Admin accounts cannot publish or modify campaigns.
