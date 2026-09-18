# TestPilot

TestPilot is an AI-assisted automated testing platform for software teams. It connects to a GitHub repository, analyzes the application context, generates meaningful test cases, and prepares the system for browser-based execution and result analysis.

## Overview

Modern software delivery depends on reliable validation across user flows, API behavior, authentication, and regression risk. TestPilot reduces that burden by combining repository understanding, AI-driven reasoning, and browser automation in one workflow.

The platform is designed to:

- connect a user to a GitHub repository
- inspect application files and surfaces
- infer critical routes, behavior, and dependencies
- generate high-value test cases from the repository evidence
- prepare test execution in a browser environment
- capture execution results for review and issue analysis

## Core Features

- GitHub OAuth authentication and repository access
- repository discovery and connection workflow
- source repository analysis and file context extraction
- AI-generated test case suggestions based on detected application surfaces
- structured storage of repositories and generated test cases
- browser execution orchestration using Browserbase
- database persistence with Drizzle and PostgreSQL
- Stripe-powered checkout and account-related flows

## Architecture

TestPilot follows a modular Next.js application architecture built around the App Router.

```text
User
  │
  ▼
Next.js App (Frontend + API)
  ├─ Clerk authentication
  ├─ GitHub OAuth
  ├─ Repository analysis
  ├─ AI test generation
  ├─ Browser execution orchestration
  └─ Database persistence
          │
          ├── PostgreSQL / Neon
          ├── Drizzle ORM
          ├── GitHub REST API
          ├── Groq LLM
          └── Browserbase
```

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js, React, TypeScript |
| Styling | Tailwind CSS |
| Authentication | Clerk |
| Source Control | GitHub OAuth + GitHub REST API |
| Backend | Next.js App Router API routes |
| Database | PostgreSQL |
| Database Hosting | Neon |
| ORM | Drizzle ORM |
| AI | Groq / LLM-powered analysis and test generation |
| Browser Automation | Browserbase |
| Payments | Stripe |

## Repository Structure

```text
TestPilot/
├── app/
│   ├── api/
│   │   ├── browserbase/
│   │   ├── checkout/
│   │   ├── github/
│   │   ├── repositories/
│   │   ├── test-cases/
│   │   ├── users/
│   │   └── webhooks/
│   ├── sign-in/
│   ├── sign-up/
│   ├── workspace/
│   ├── layout.tsx
│   ├── page.tsx
│   └── provider.tsx
├── components/
│   ├── custom/
│   └── ui/
├── context/
├── db/
│   ├── index.ts
│   └── schema.ts
├── docs/
├── drizzle/
├── lib/
│   ├── ai/
│   ├── browserbase/
│   ├── github/
│   ├── repository/
│   ├── stripe.ts
│   └── test-execution/
├── public/
├── next.config.ts
├── package.json
├── drizzle.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── components.json
├── proxy.ts
├── .gitignore
├── readme.md
└── docs/
```

## Prerequisites

Before running the project, make sure you have:

- Node.js 18+ or compatible LTS version
- npm or pnpm
- Git
- access to a PostgreSQL-compatible database service such as Neon
- Clerk application credentials
- GitHub OAuth app credentials
- Browserbase API credentials
- Groq API credentials
- Stripe keys if checkout or billing features are enabled

## Environment Variables

Create a `.env.local` file in the project root and define the required variables.

Example configuration:

```env
DATABASE_URL=postgresql://...

NEXT_PUBLIC_APP_URL=http://localhost:3000

CLERK_SECRET_KEY=...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...

GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_REDIRECT_URI=http://localhost:3000/api/github/callback

GROQ_API_KEY=...
GROQ_MODEL=openai/gpt-oss-20b

BROWSERBASE_API_KEY=...
BROWSERBASE_PROJECT_ID=...

STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
```

> Do not commit secrets to version control. Use environment-specific files and secure secret management in production.

## Getting Started

### 1. Install dependencies

```bash
git clone <repository-url>
cd TestPilot
npm install
```

### 2. Configure environment variables

Add the required variables to `.env.local` before starting the application.

### 3. Set up the database

```bash
npm run db:generate
npm run db:push
```

Optional database tools:

```bash
npm run db:studio
```

### 4. Run the app

```bash
npm run dev
```

The app will be available at:

```text
http://localhost:3000
```

## Available Scripts

```bash
npm run dev       # start the development server
npm run build     # create a production build
npm run start     # run the production build
npm run lint      # run lint checks
npm run db:generate
npm run db:push
npm run db:studio
```

## Application Flow

The typical workflow is:

1. sign in through Clerk
2. connect a GitHub account
3. authorize repository access
4. select a repository for analysis
5. inspect repository context and generated application surfaces
6. generate high-value test cases
7. execute tests in a browser environment
8. review execution logs, outcomes, and failure details

## Documentation

Project documentation is organized in the `docs/` folder and should be treated as the technical reference for deeper implementation details.

| Document | Purpose |
| --- | --- |
| `docs/api.md` | API route and backend contract reference |
| `docs/authentication.md` | Clerk and GitHub auth flow |
| `docs/database.md` | schema design and database usage |
| `docs/repository-ingestion.md` | repository analysis and ingestion process |
| `docs/test-generation.md` | AI-driven test generation workflow |
| `docs/test-execution.md` | browser-based execution process |

## Security Notes

This application handles authentication, access tokens, and source repository data. Follow these practices:

- keep secrets in environment variables or secure secret management
- avoid logging sensitive tokens or credentials
- keep GitHub OAuth tokens server-side
- validate access control on sensitive routes
- review AI ingestion of repository content before production rollout

## Status

This project is in active product development. Core workflows are being built around repository analysis, GitHub integration, AI-generated testing, and browser execution.

## License

This project does not currently declare a license in the repository root. Add an appropriate license file before production or public distribution.
- Server-side handling of the GitHub access token
- `httpOnly` cookie storage for the GitHub token
- Clerk-managed application authentication
- Database-level ownership relationships
- Database constraints preventing duplicate repository connections

Future security work includes secure handling of repository content, prompt-injection defenses for untrusted source code, sandboxing generated browser scripts, access control, rate limiting, and secure execution boundaries.

## License

This project is currently under development. License information will be added when the project's distribution terms are finalized.
