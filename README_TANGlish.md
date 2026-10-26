# ClassVault - Starter App (Tanglish guide)

Indha folder-la ClassVault mobile app-oda first UI prototype irukku.

## Run panna steps

1. ZIP extract pannunga.
2. VS Code-la `ClassVault_Expo_Starter` folder open pannunga.
3. VS Code Terminal open pannunga (`Terminal > New Terminal`).
4. Indha command run pannunga:

   ```bash
   npm install
   ```

5. Install mudinja apram:

   ```bash
   npx expo start
   ```

6. Android phone-la Play Store-lirundhu **Expo Go** install pannunga.
7. Laptop-um phone-um same Wi-Fi-la connect pannunga.
8. Terminal-la varra QR code-a Expo Go use panni scan pannunga.

If same Wi-Fi connect aagala / QR work aagala, terminal stop pannitu try pannunga:

```bash
npx expo start --tunnel
```

## What's included now?

- Supabase email sign-in/sign-up
- Account-oda real groups, members, messages, and materials
- Classes tab-la original II B.C.A. six-day rotating timetable; Day 1–6 manually select pannalaam
- Backend moolama create/join groups, invite codes, and messages
- Search, recent activity, and dark/light theme

## Important

- First run-ku Supabase SQL schema and migrations apply pannunga; details `../backend/README.md`-la irukku.
- Pudhu account create pannumbodhu Supabase email confirmation enabled-na email verify pannitu sign in pannunga.
- Physical Android phone use pannina Expo `.env`-la `EXPO_PUBLIC_API_URL`-a computer-oda LAN IP-oda set pannunga (example: `http://192.168.1.10:4000`). `localhost` phone-ai kurikkum; computer-ai illa.
- App store publish panna munnaadi real device testing and security review thevai.

## Android APK build

- `eas.json`-la preview build profile APK output-ku set pannirukku.
- Expo account-la login pannitu, app root folder terminal-la `npx eas-cli build:configure` run pannunga. First time EAS project create panna prompt varalaam.
- Expo dashboard-la indha project-oda **preview** environment-ku `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_API_URL` public variables-aa add pannunga. `.env` local file mattum cloud build-kku kidaikkama irukkalaam.
- `npm run build:android:apk` run pannunga. EAS cloud-la build mudinja piragu, build page-la irukkura link moolama `.apk` download pannalaam.
- Indha APK profile internal testing-kku. `SUPABASE_SECRET_KEY`-a EAS variables, Expo app, APK-la add panna koodadhu; backend Space Secret-la mattum vainga.

## PostgreSQL database schema

- `database/schema.sql`-la profiles, groups, group membership, messages, learning materials, and group invites-oda PostgreSQL schema irukku.
- PostgreSQL 13+ use pannunga.
- PostgreSQL database-la apply panna: `psql "<connection-string>" -f database/schema.sql`
- Supabase SQL Editor-la schema-um migrations-um apply pannitu backend start pannunga; details keezha irukku.
- Mobile app-kku database credentials direct-aa kodukka koodadhu. Backend/API or properly configured Supabase Auth + Row Level Security moolama access control add pannitu connect pannunga.

## Supabase app connection

- App folder-oda `.env`-la `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_API_URL` set pannunga. `.env.example` sample format; local backend use pannumbodhu `EXPO_PUBLIC_API_URL=http://localhost:4000`. Separate backend Docker Space Running aana piragu mattum, adhan API base URL-ai `EXPO_PUBLIC_API_URL`-la set pannunga; frontend Static Space URL-ai API URL-aa use panna koodadhu.
- Expo environment values app bundle-kulla pogum. `SUPABASE_SECRET_KEY`-a mobile app env variable-aa maatri use panna koodadhu; adhai trusted server/backend-kku mattum vainga.
- Supabase Auth sign-in and account session indha client use pannum; group reads/writes-ku authenticated `backend/` API use pannum.
- `.env` change pannina Expo server restart pannunga: `npx expo start --clear`.

## Separate backend API

- `../backend/`-la Supabase Auth token verify pannura Express API irukku. Group, message, material, invite, and join API details-ku `../backend/README.md` paarunga.
- Supabase SQL Editor-la `database/schema.sql`-um, adhukku apram `database/migrations/001_consume_group_invite.sql` and `database/migrations/002_secure_client_access.sql`-um apply pannunga.
- Hardcoded II BCA class catalog import panna `database/seeds/001_ii_bca_class_catalog.sql` open panni `REPLACE_WITH_SUPABASE_LOGIN_EMAIL`-a unga confirmed Supabase login email-aa replace pannitu SQL Editor-la run pannunga. Idhu account-ai student-aa, listed faculty-ai staff-aa groups-la add pannum; repeat pannalum duplicate aagadhu.
- Workspace root `.env`-la irukkura `SUPABASE_URL` and `SUPABASE_SECRET_KEY` backend-kku mattum use aagum. Secret key-a Expo `.env`/app code-kku copy panna koodadhu.
- Backend run panna `backend/` folder-la `npm install` apram `npm run dev` run pannunga. Authenticated API calls-ku Supabase Auth access token thevai.
- Pudhu Hugging Face Docker Space create/connect steps and required Settings variables-ku `backend/README.md` paarunga. Free compute/quota available-nu confirm pannina piragu mattum Space create pannunga; paid hardware/plan choose panna vendam. Space files review pannitu neenga approve pannina piragu mattum push pannunga.
- Beginner steps: Hugging Face-la **New Space** create pannumbodhu **Docker** SDK select pannunga. Unga account-ku free compute/quota available-nu confirm aagala-na inga stop pannunga; paid option select panna vendam.
- Pudhu Space-ai local-aa clone pannitu, indha project `backend/` folder-oda files-ai andha pudhu clone folder root-kku copy pannunga. `.env`, `node_modules`, `dist` copy panna vendam; current app/backend folder-ai move/delete panna thevai illa.
- Space **Settings**-la `SUPABASE_URL`-ai Variable-aa, `SUPABASE_SECRET_KEY`-ai Secret-aa set pannunga. Expo Web localhost use pannina `CORS_ORIGINS` default pothum; vera browser origin irundha andha exact origin-ai comma-separated-aa add pannunga.
- Files-ai review pannitu, neenga publish panna decide/approve pannina piragu mattum pudhu clone folder-lirundhu Hugging Face-kku push pannunga. Space **Running** aana piragu `https://<username>-<space-name>.hf.space/health`-la `{"status":"ok"}` verify pannunga.
- App `.env`-la `EXPO_PUBLIC_API_URL`-ai unga pudhu backend Docker Space-oda actual base URL-aa (`/health` illama) update panni `npx expo start --clear` run pannunga. Pudhu backend Space uruvaagum varai example config local backend `http://localhost:4000`-ai use pannum.
- Expo frontend-ai free Static Space-la demo panna, Expo folder root-lirundhu `npx expo export --platform web --output-dir hf-space-demo` run pannitu `hf-space-demo/`-oda files-ai **Static SDK** Space-kku upload pannunga. Idhu frontend mattum serve pannum; Express backend-ai run pannaadhu.
- Static Space **Settings**-la `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_API_URL`-ai public Variables-aa set pannunga. `EXPO_PUBLIC_API_URL`-la separate-aa running backend-oda base URL podunga. Backend-oda `CORS_ORIGINS`-la `https://<username>-<space-name>.hf.space` exact browser origin-ai add pannunga.
- `SUPABASE_SECRET_KEY`-ai Static Space, app, bundle-la podaadheenga; adhu backend Space-oda **Secret** mattum. Backend API available illa-na frontend success-nu sollaama error kaattum.
- App sign in aana piragu authenticated backend API moolama group/activity data load pannum. SQL setup pannala-na backend data request fail aagum.
- Hugging Face Space **Running**-la irukkanum; Space paused-aa irundha app API-ai reach panna mudiyadhu. Hugging Face Space Settings-la `SUPABASE_URL`, `SUPABASE_SECRET_KEY` secret, and web app use pannina `CORS_ORIGINS` configure pannunga.
- `DATABASE_SCHEMA_MISSING` error vandha Supabase SQL Editor-la schema and rendu migrations-ai order-la apply pannunga. Backend code/env maathina API-ai restart pannunga; exact database error backend terminal-la log aagum.

## Folder notes

`App.tsx` = main screen code.
`app.json` = app name and Expo config.
`package.json` = project dependencies and commands.
