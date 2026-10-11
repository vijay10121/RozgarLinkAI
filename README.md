# RozgarLink

RozgarLink is a skills-to-opportunity matching platform. This repository contains the Next.js frontend, Supabase authentication,
candidate profile, and job-seeker marketplace experience. Jobs and courses are
loaded from published Supabase records; this application does not seed or
present sample listings as real opportunities.

## Requirements

- Node.js 20.19 or later
- npm
- A Supabase project for features that use the Supabase client

## Getting started

Install dependencies:

```bash
npm install
```

Create a local environment file:

```powershell
Copy-Item .env.example .env.local
```

Or, in a POSIX shell:

```bash
cp .env.example .env.local
```

Add the project URL and public publishable key from your Supabase project
settings to `.env.local`. The example file intentionally contains placeholders
only. Do not expose a Supabase service-role key in frontend environment
variables.

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```text
src/
├── app/                    # App Router pages, root layout, auth callback, and styles
├── components/
│   ├── auth/               # Registration and login forms
│   ├── layout/             # Shared site header and footer
│   ├── seeker/             # Job-seeker navigation, forms, and cards
│   ├── states/             # Reusable loading, empty, and error states
│   └── ui/                 # shadcn/ui primitives
├── hooks/                  # Shared React hooks (ready for feature work)
├── lib/
│   ├── supabase/           # Browser/server client factories and config
│   └── utils.ts            # Shared class-name utility
├── proxy.ts                # Refreshes Supabase sessions before rendering
└── types/                  # Shared application types
supabase/
├── config.toml             # Supabase CLI project configuration
└── migrations/             # Versioned PostgreSQL schema and RLS policies
```

Next.js routes and route-level layouts belong under `src/app`. The job-seeker
workspace is under `src/app/seeker`; shared seeker UI lives in
`src/components/seeker`. The Python FastAPI service is not part of this
frontend yet. Eligibility is currently checked by a guarded Supabase database
function using the candidate's persisted profile.

## Supabase integration

### Configure the project

1. Create a Supabase project and copy its **Project URL** and **Publishable
   key** from the project API settings.
2. Create your local environment file and enter those values:

   ```powershell
   Copy-Item .env.example .env.local
   ```

   ```bash
   cp .env.example .env.local
   ```

   Set `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The legacy
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` is accepted as a fallback for existing
   projects, but new setup should use the publishable-key variable.
3. Never put a Supabase secret/service-role key in a `NEXT_PUBLIC_*` variable
   or browser code. This app uses the public publishable key together with
   authenticated Supabase sessions and database RLS; it does not configure a
   privileged client.

The browser client is `createClient` from `@/lib/supabase/client`. Server
components, route handlers, and server actions should use
`createClient` from `@/lib/supabase/server`. Login, logout, password recovery,
and password changes run as server actions. The Next.js proxy refreshes
sessions and authorizes `/seeker/*`, `/admin/*`, and `/trainer/*` paths from
the authenticated user's database profile. Each role route layout repeats
that authorization on the server before rendering. Never use browser-provided
role data for access decisions.

Set `NEXT_PUBLIC_SITE_URL` to the canonical app origin for password-reset
emails; do not derive this URL from a request header. It defaults to
`http://localhost:3000` in `.env.example`. Add
`/auth/callback` and the recovery redirect
`/auth/callback?next=/reset-password` to the Supabase Auth redirect URL
allowlist for local and deployed origins. Password-reset links use the callback
and return to `/reset-password`; email confirmation links return to `/login`.

### Apply database migrations

The schema migrations are committed under
[`supabase/migrations/`](./supabase/migrations/). Apply them to a linked
Supabase project with the Supabase CLI:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Review the migrations before applying them to production. They create profile
and organization records, enable RLS, and add scoped grants and policies.
Supabase Auth creates profiles in a database trigger, so provisioning remains
atomic even when email confirmation is enabled. Public signup can choose a
job-seeker or training-provider profile; role and sector values are
allowlisted by the trigger. Provider organizations are always created
unverified. Signup cannot set account status or verify an organization.
The fourth migration allows a suspended user to read their own profile status
so the application can show the correct access-denied message; it does not
grant access to another user's profile.

Admin registration submits a request and initially provisions the account as
a job seeker. An active administrator must approve the request using the
`admin_review_access_request` database function before the profile gains the
admin role; approval creates an unverified organization. An active admin can
also manage profiles with `admin_update_profile` and verify organizations
with `admin_set_organization_verified`. To bootstrap the first administrator,
first create and confirm that user's account, then run this once in the
Supabase SQL Editor using that user's Auth UUID:

```sql
update public.profiles
set role = 'admin', sector = 'government'
where id = 'AUTH_USER_UUID';
```

Keep the UUID specific to the intended account and run this using a trusted
project-owner connection, not from the application. All later role and
verification changes should use the guarded admin functions.

The marketplace migration
[`20261011000500_job_seeker_marketplace.sql`](./supabase/migrations/20261011000500_job_seeker_marketplace.sql)
adds candidate profile preferences, published jobs and courses, saved items,
applications, course-interest tracking, notifications, and a private resume
bucket with owner-only policies. Apply it with the same `npx supabase db push`
command above. Only authorized staff should create and publish actual job and
course records; no demo records are included.

Applications are created by the `apply_to_job` database function, which
rechecks eligibility from the authenticated candidate's stored profile and
prevents duplicate applications with a database uniqueness constraint.
Eligibility is an exact match against required skills and qualifications plus
minimum experience; it does not produce a match score. Course visits and
inquiries are recorded separately and do not represent enrollment. Candidate
resumes are private and must be downloaded through the authenticated
`/seeker/profile/resume` route.

Add your local and deployed app URLs to the Supabase Auth redirect URL
allowlist. Registration email links return to `/auth/callback`, which
exchanges the confirmation code for a session and then links to the login
page. The confirmation email template should use Supabase's
`{{ .ConfirmationURL }}` so the configured redirect is preserved.

## Available commands

```bash
npm run dev       # Start the development server
npm run lint      # Run ESLint
npm run typecheck # Run the TypeScript compiler without emitting files
npm test          # Run authentication and seeker feature tests
npm run build     # Create a production build
npm run start     # Serve the production build
```

## Authentication behavior

After Supabase password authentication, the server reads `profiles.role` and
`profiles.account_status` and routes active accounts to `/seeker/dashboard`,
`/admin/dashboard`, or `/trainer/dashboard`. Suspended accounts are signed out.
Missing profiles and profile lookup failures receive explicit login errors.
Email verification must be completed before Supabase permits password login.
Use the logout button in the authenticated header to end the server-managed
Supabase session. The seeker routes require the marketplace migration and real
published database records; if the migration is unapplied, the seeker error
boundary offers a retry instead of showing fabricated data.

## UI foundation

Tailwind CSS v4 provides the utility layer. Shared colors, typography, and
radii are defined in `src/app/globals.css`. shadcn/ui components are in
`src/components/ui`; use the `cn` helper from `@/lib/utils` when composing
Tailwind class names. Add further primitives with the shadcn CLI:

```bash
npx shadcn@latest add input
```
