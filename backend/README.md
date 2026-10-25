---
title: ClassVault API
emoji: 🎓
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
---

# ClassVault API

Standalone TypeScript/Express API backed by Supabase Auth and the PostgreSQL schema in `../database/schema.sql`.

## Deploy to Hugging Face Spaces

This backend is configured as a Docker Space and requests Hugging Face's `cpu-basic` hardware (no hourly compute charge). However, Hugging Face currently requires this account to have a PRO plan to run this compute-backed Space. The free hourly price does not waive the plan requirement. The Space will remain paused unless the required plan is active. Keep it on CPU Basic: ZeroGPU Spaces are currently limited to the Gradio SDK, so ZeroGPU cannot run this Express/Docker API.

The Space repository root must contain this folder's `Dockerfile`, `.dockerignore`, `package.json`, `package-lock.json`, `tsconfig.json`, `src/`, and this `README.md`.

1. Clone the Space repository using your authenticated Hugging Face account. Do not put an access token in the clone URL:

   ```powershell
   hf auth login
   git clone https://huggingface.co/spaces/wyokesh-47/classVault_server
   ```

2. Copy the contents of this `backend/` folder into the cloned Space repository root. Do not copy `.env`, `node_modules`, or `dist`.
3. In the Space's **Settings**, add:
   - Variable `SUPABASE_URL` with your Supabase project URL.
   - Secret `SUPABASE_SECRET_KEY` with your server-only Supabase secret key.
   - Variable `CORS_ORIGINS` with the exact browser origin(s) of your web app, comma-separated. Native mobile requests do not require CORS.
4. Commit and push the Space files. Hugging Face will build the Docker image and serve the API on port `7860`.
5. Wait for the Space to report **Running**, then verify `https://wyokesh-47-classvault-server.hf.space/health` returns `{"status":"ok"}`.
6. Set `EXPO_PUBLIC_API_URL=https://wyokesh-47-classvault-server.hf.space` in the Expo app's `.env` and restart Expo with `npx expo start --clear`.

Never add Supabase credentials to the Space repository, the Expo app, or a client environment variable. Configure the Supabase key as a Space Secret only.

## Run locally

1. Apply the app schema and invite RPC migration in the Supabase SQL Editor:
   - `database/schema.sql`
   - `database/migrations/001_consume_group_invite.sql`
   - `database/migrations/002_secure_client_access.sql`
2. To import the original class catalog, open `database/seeds/001_ii_bca_class_catalog.sql`, replace `REPLACE_WITH_SUPABASE_LOGIN_EMAIL` with the confirmed login email, and run it in the Supabase SQL Editor. The seed is repeat-safe and adds the account as a student plus the listed teachers as staff. It intentionally excludes illustrative messages, fake member names, and example.com materials.
3. Create `backend/.env` from `backend/.env.example` for local development, or configure the environment variables in your hosting provider.
4. From the `backend/` folder, run `npm install`, then `npm run dev`.
5. The API listens on `http://localhost:4000` locally. `GET /health` does not require authentication.

The Expo app's `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is public and is not used as the server credential. Never expose `SUPABASE_SECRET_KEY` in the app or a client bundle. The backend verifies each bearer access token with Supabase Auth, then checks group membership and role before using the server-only key for database operations.

## Authenticated API

Send `Authorization: Bearer <Supabase access token>` to `/api/*`.

- `GET /api/groups` — list the caller's groups.
- `GET /api/activity` — latest visible messages and materials from the caller's groups.
- `POST /api/groups` — create a group; creator becomes a rep.
- `GET|POST /api/groups/:groupId/messages` — list or post messages. Student messages expire after 24 hours.
- `GET|POST /api/groups/:groupId/materials` — list materials; reps and staff can add them.
- `POST /api/groups/:groupId/invites` — create a single-use-returned invite code with an expiry and optional use limit. Only reps and staff can create invites.
- `POST /api/invites/join` with `{ "code": "..." }` — join via an invite code. Invite use is consumed atomically.

Apply both migrations before using invites or authenticated direct Supabase reads. Row-level security restricts direct client reads to authenticated group members; writes go through this authenticated backend. The Expo app uses Supabase Auth for sign-in and this API for real group, activity, message, and material reads.

If the API reports `DATABASE_SCHEMA_MISSING` or `DATABASE_SCHEMA_OUTDATED`, apply the SQL files above in order. `DATABASE_PERMISSION_ERROR` means the backend's `SUPABASE_SECRET_KEY` should be checked. Database error codes and details are printed in the backend terminal; restart the API after updating the backend code or environment.
