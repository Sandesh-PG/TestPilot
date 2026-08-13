# TestPilot

TestPilot is an AI-powered test automation platform that analyzes a GitHub repository, generates application-aware test cases, executes them in a browser environment, and provides actionable insights from test results.

## Overview

Modern web applications can require significant manual effort to test. Engineers and QA teams need to understand application flows, create test cases, maintain automation scripts, execute tests, and investigate failures.

TestPilot aims to streamline this workflow by combining repository analysis, AI-powered test generation, browser automation, and result analysis into a single platform.

The intended workflow is:

```text
GitHub Repository
       │
       ▼
Repository Analysis
       │
       ▼
Application Context
       │
       ▼
AI Test Generation
       │
       ▼
Browser Test Execution
       │
       ▼
Test Results
       │
       ▼
AI-Powered Insights
```

## Features

- GitHub OAuth integration
- GitHub repository discovery and selection
- Persistent repository connections
- Repository source-code analysis
- AI-powered test-case generation
- Structured test-case storage
- Browser-based test execution
- Test result and execution history
- AI-assisted failure analysis and insights

Some features are under active development.

## Architecture

At a high level, TestPilot consists of the following components:

```text
┌───────────────────────┐
│       Web Client      │
│   Next.js + React     │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│    Next.js API Layer  │
│      App Router       │
└─────┬─────────┬───────┘
      │         │
      │         └─────────────────┐
      ▼                           ▼
┌───────────────┐        ┌────────────────┐
│    GitHub     │        │     Clerk      │
│      API      │        │ Authentication │
└───────────────┘        └────────────────┘
      │
      ▼
┌───────────────────────┐
│   Repository Analysis │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│     AI Test Engine    │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│   Browser Execution   │
│      BrowserBase      │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Results & Insights   │
└───────────────────────┘

          │
          ▼
┌───────────────────────┐
│ Neon PostgreSQL +     │
│ Drizzle ORM           │
└───────────────────────┘
```

Detailed architecture documentation is maintained separately in `docs/`.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Styling | Tailwind CSS |
| Authentication | Clerk |
| Source Control Integration | GitHub OAuth + GitHub REST API |
| Backend | Next.js App Router API Routes |
| Database | PostgreSQL |
| Database Hosting | Neon |
| ORM | Drizzle ORM |
| AI | LLM-based test generation and analysis |
| Browser Automation | BrowserBase |

## Getting Started

### Prerequisites

Make sure the following are installed:

- Node.js
- npm
- Git

You will also need accounts/configuration for:

- Clerk
- GitHub OAuth
- Neon PostgreSQL

Additional services will be required as the AI and browser-execution layers are enabled.

### Installation

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd TestPilot
npm install
```

### Environment Variables

Create a `.env.local` file in the project root and configure the required application credentials.

The exact environment variables depend on the enabled integrations. At minimum, the application requires configuration for:

- Clerk
- GitHub OAuth
- Neon/PostgreSQL

Do not commit secrets or `.env.local` to source control.

### Database

Generate/push the current Drizzle schema using:

```bash
npm run db:push
```

The project also provides:

```bash
npm run db:generate
npm run db:studio
```

### Development Server

Start the application with:

```bash
npm run dev
```

The development server will be available at:

```text
http://localhost:3000
```

## Usage

The current application flow is:

1. Sign in to TestPilot.
2. Open the workspace.
3. Connect a GitHub account.
4. Authorize TestPilot through GitHub OAuth.
5. Browse repositories available to the authenticated GitHub account.
6. Select a repository.
7. Connect the repository to TestPilot.
8. TestPilot persists the repository connection for the application user.

The repository analysis and automated testing workflow builds on this foundation.

## Project Structure

```text
TestPilot/
├── app/
│   ├── api/
│   │   ├── github/
│   │   ├── repositories/
│   │   └── users/
│   ├── workspace/
│   └── provider.tsx
│
├── components/
│   └── custom/
│
├── context/
│
├── db/
│   ├── index.ts
│   └── schema.ts
│
├── public/
│
└── docs/
```

The project uses the Next.js App Router. Application-specific UI is organized under `components/`, database access under `db/`, and backend endpoints under `app/api/`.

## Documentation

Detailed technical documentation is maintained separately from this README.

| Document | Description |
|---|---|
| `docs/architecture.md` | System architecture and component interactions |
| `docs/authentication.md` | Clerk authentication and GitHub OAuth |
| `docs/database.md` | Database schema, relationships, and persistence |
| `docs/api.md` | Backend API reference |
| `docs/repository-ingestion.md` | Repository tree and source-code ingestion |
| `docs/test-generation.md` | AI test-generation pipeline |
| `docs/test-execution.md` | Browser-based test execution |
| `docs/insights.md` | Test-result analysis and AI-generated insights |

These documents will be added and expanded as the corresponding functionality is implemented.

## Security

TestPilot handles authentication credentials and access to source-code repositories, so security is an important part of the system design.

Current measures include:

- GitHub OAuth instead of collecting GitHub passwords
- Server-side handling of the GitHub access token
- `httpOnly` cookie storage for the GitHub token
- Clerk-managed application authentication
- Database-level ownership relationships
- Database constraints preventing duplicate repository connections

Future security work includes secure handling of repository content, prompt-injection defenses for untrusted source code, sandboxing generated browser scripts, access control, rate limiting, and secure execution boundaries.

## License

This project is currently under development. License information will be added when the project's distribution terms are finalized.
