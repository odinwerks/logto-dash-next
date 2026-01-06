# Logto Debug Dashboard

A Next.js debug dashboard for Logto authentication, built as a learning project to understand Logto's Account API and provide a reference implementation for others.

## Why this exists

I struggled with Logto's documentation and wanted to see how things are actually implemented. This project is the result of that exploration. It's not production‑grade, but it shows how to interact with Logto's Account API for user profile management, email/phone verification, and MFA. I'm sharing it so others can skip the hard parts I went through.

## What works

- **Terminal‑themed UI** with dark/light mode toggle (client‑side, persists in localStorage)
- **Six tabs**: User, Custom Data, Identities, Organizations, Raw JSON, MFA
- **Real‑time user data** from Logto's `/api/my-account` endpoint
- **Profile editing**: Basic info (name, username, avatar URL), profile fields (given/family name)
- **Custom data** – full JSON editing with validation
- **Email & phone verification** – multi‑step flows (send code, verify, update primary contact)
- **MFA management** – TOTP secret generation, QR code display, backup codes (create/view)
- **Copy buttons** for tokens and JSON blobs
- **Authentication** – sign‑in, sign‑out, middleware protection

## What doesn't work (or is incomplete)

- **Identities tab** – only displays existing identities; no linking/unlinking UI
- **Organizations tab** – only displays membership data; no join/leave actions
- **WebAuthn** – not implemented at all (planned)
- **Tests** – zero test coverage
- **Error handling** – basic try/catch, no user‑friendly error states
- **Code structure** – monolithic component (`UserProfileData.tsx` is 2800+ lines)
- **Security** – relies on Logto's API validation; no additional hardening

## Architecture

### Core files

- **`app/logto.ts`** – Aggressive environment validation, scope mapping, config builder
- **`app/utils/logto‑actions.ts`** – Server actions that call Logto's Account API (GET/PATCH/POST/DELETE)
- **`app/components/UserProfileData.tsx`** – The entire UI (one huge component)
- **`app/page.tsx`** – Home page; conditionally renders sign‑in button or the dashboard
- **`middleware.ts`** – Public‑route skipping, triggers sign‑in for unauthenticated requests
- **`app/callback/route.ts`** – OAuth callback handler

### How it's built

1. **Authentication** – uses `@logto/next` SDK; middleware enforces auth on all non‑public routes
2. **Data fetching** – server actions obtain an access token via `getAccessToken`, then call Logto's REST API
3. **UI updates** – client‑side state drives the terminal‑style tabs; each tab conditionally renders forms or read‑only views
4. **Verification flows** – multi‑step state machines (send code → verify → update) that require password confirmation for sensitive operations

## Goals & chores

- **De‑monolith** – split `UserProfileData.tsx` into smaller, composable components
- **Implement WebAuthn** – add passkey registration/authentication via Logto's MFA endpoints
- **Add identities/organizations UI** – actually allow linking/unlinking identities and managing org membership
- **Write tests** – unit tests for server actions, integration tests for UI flows
- **Build a Next.js self‑service dashboard** – once all features are stable, create a standalone admin panel
- **Create a user‑button kit** – reusable React components for Next.js apps that need Logto integration

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/odinwerks/logto-dash-next.git
   cd logto-dash-next
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local`:
   ```
   APP_ID=your_app_id_from_logto_admin
   APP_SECRET=your_app_secret_from_logto_admin
   ENDPOINT=https://your‑logto‑instance.com
   BASE_URL=http://localhost:3000
   COOKIE_SECRET=generate_a_32_character_random_string_here
   NODE_ENV=development
   ```

4. **Configure Logto Admin**
   - Redirect URI: `http://localhost:3000/callback`
   - Post sign‑out redirect URI: `http://localhost:3000/`
   - Ensure Account API is enabled on your Logto instance
   - Required scopes: `profile`, `custom_data`, `email`, `phone`, `identities`

5. **Run the dev server**
   ```bash
   npm run dev
   ```

6. **Open** `http://localhost:3000`


## Development

```bash
npm install
npm run dev
npm run build
npm start
```

## Screenshots

**User Profile View**
![User Profile](images%20for%20readme/User.png)

**User Profile Edit**
![User Edit](images%20for%20readme/User-edit.png)

**Custom Data Management**
![Custom Data](images%20for%20readme/Custom.png)

**Custom Data Edit**
![Custom Edit](images%20for%20readme/Custom-edit.png)

**MFA Management**
![MFA](images%20for%20readme/MFA.png)

**TOTP Setup**
![TOTP](images%20for%20readme/TOTP.png)

**Backup Codes**
![Backup Codes](images%20for%20readme/backup-codes.png)

**Raw JSON Data**
![Raw JSON](images%20for%20readme/Raw.png)

**Backup Export HTML**
![Backup Export HTML](images%20for%20readme/Backup-Export-HTML.png)

## License

I really do not care man, just do not hurt yourself trying to run this code and am' good. <3