---
title: ClassVault API
emoji: 🎓
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
---

# ClassVault API

Standalone Express 5 and TypeScript API backed by Supabase Auth and PostgreSQL. The backend directory contains the Docker build context: `Dockerfile`, `.dockerignore`, `package.json`, `package-lock.json`, `tsconfig.json`, and `src/`. The server binds to `0.0.0.0`; the Docker image uses `PORT=7860` by default, and the runtime `PORT` environment variable can override it. Local development defaults to port `4000`.

## Prepare a new Hugging Face Docker Space

Create the Space and connect it only after confirming that your account has access to the required free compute/quota. Do not select paid hardware or upgrade a plan as part of these instructions. Docker build and start commands are defined in the existing `Dockerfile` and `package.json`.

1. On Hugging Face, create a **new Space** with the **Docker** SDK. Select hardware only if the Hugging Face page confirms it is available to your account without payment.
2. Clone that new Space repository to your computer. Authenticate using the Hugging Face CLI if prompted; do not put an access token in the clone URL:

   ```powershell
   hf auth login
   git clone https://huggingface.co/spaces/YOUR_USERNAME/YOUR_NEW_SPACE
   ```

3. Copy the contents of this project's `backend/` folder into the cloned Space repository root. Copy the Dockerfile, `.dockerignore`, package files, TypeScript config, `src/`, and this README. Do not copy `.env`, `node_modules`, `dist`, or any credentials. The destination is the newly cloned Space folder; this does not require changing the existing app/backend folder.
4. In the new Space's **Settings**, add:
   - Variable `SUPABASE_URL` — your Supabase project URL.
   - Secret `SUPABASE_SECRET_KEY` — the server-only Supabase secret key. Never add it to the app, frontend environment, source control, or logs.
   - Variable `CORS_ORIGINS` — comma-separated exact browser origins. For local Expo Web the existing backend default is `http://localhost:8081,http://localhost:19006`. If the frontend is deployed in a separate Hugging Face Static Space, also include its exact origin, `https://<username>-<static-space-name>.hf.space`. Native app requests do not require browser CORS.
5. Review the files in the cloned Space repository before committing. Only after you explicitly choose to publish it, commit and push from that cloned folder; Hugging Face then builds the Docker image.
6. Once the Space reports **Running**, open `https://YOUR_USERNAME-YOUR_NEW_SPACE.hf.space/health`. The expected response is HTTP 200 and `{"status":"ok"}`. This checks that the API process is responding; it does not verify Supabase access.
7. Set `EXPO_PUBLIC_API_URL` in the Expo app's local `.env` to that new Space's actual URL (without `/health`), then restart Expo with `npx expo start --clear`. Keep `EXPO_PUBLIC_API_URL` configurable; the checked-in `.env.example` uses `http://localhost:4000` for local development, not an unavailable Space URL.

Hugging Face can pause Spaces when account compute quota is unavailable. A code change cannot bypass a quota limit. If the new Space cannot run using available free access, stop and review the account's official options; do not select paid hardware or upgrade without deciding to do so.

## Run locally

1. From the Expo project folder, apply the app schema and invite RPC migrations in the Supabase SQL Editor:
   - `database/schema.sql`
   - `database/migrations/001_consume_group_invite.sql`
   - `database/migrations/002_secure_client_access.sql`
2. To import the original class catalog, open `database/seeds/001_ii_bca_class_catalog.sql`, replace `REPLACE_WITH_SUPABASE_LOGIN_EMAIL` with the confirmed login email, and run it in the Supabase SQL Editor. The seed is repeat-safe and adds the account as a student plus the listed teachers as staff. It intentionally excludes illustrative messages, fake member names, and example.com materials.
3. Create `backend/.env` from `backend/.env.example` for local development, or configure the environment variables in your hosting provider.
4. From the `backend/` folder, run `npm install`, then `npm run dev`.
5. The API listens on `http://localhost:4000` locally. `GET http://localhost:4000/health` does not require authentication and returns `{"status":"ok"}`.

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
