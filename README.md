# RozgarLink

RozgarLink is a skills-to-opportunity matching platform. This repository
currently contains the frontend foundation only; authentication workflows,
job and course data, role-specific dashboards, and matching behavior have not
been implemented.

## Requirements

- Node.js 20.9 or later
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

Add the project URL and public anon key from your Supabase project settings to
`.env.local`. The example file intentionally contains placeholders only. Do
not expose a Supabase service-role key in frontend environment variables.

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```text
src/
├── app/                    # App Router pages, root layout, and global styles
├── components/
│   ├── layout/             # Shared site header and footer
│   ├── states/             # Reusable loading, empty, and error states
│   └── ui/                 # shadcn/ui primitives
├── hooks/                  # Shared React hooks (ready for feature work)
├── lib/
│   ├── supabase/           # Browser/server client factories and config
│   └── utils.ts            # Shared class-name utility
└── types/                  # Shared application types (ready for feature work)
```

Next.js routes and route-level layouts belong under `src/app`. Shared layout
components live in `src/components/layout`. The Python FastAPI service and
database migrations are not part of this frontend foundation yet.

## Supabase integration

Import `createClient` from `@/lib/supabase/client` in client components or
from `@/lib/supabase/server` in server-side code. Both clients require the
environment variables in `.env.local`; creating a client without them reports
an explicit configuration error. Use the server client in a request context
where Next.js allows cookies to be read and written, such as a route handler
or server action.

Only the public Supabase URL and anon key belong in the browser app. Enforce
data access through Supabase Row Level Security policies as product schemas
are introduced.

## Available commands

```bash
npm run dev       # Start the development server
npm run lint      # Run ESLint
npm run typecheck # Run the TypeScript compiler without emitting files
npm run build     # Create a production build
npm run start     # Serve the production build
```

## UI foundation

Tailwind CSS v4 provides the utility layer. Shared colors, typography, and
radii are defined in `src/app/globals.css`. shadcn/ui components are in
`src/components/ui`; use the `cn` helper from `@/lib/utils` when composing
Tailwind class names. Add further primitives with the shadcn CLI:

```bash
npx shadcn@latest add input
```
