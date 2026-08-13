# TestPilot

> AI-powered agentic test automation platform that connects to a GitHub
> repository, analyzes application source code, generates test cases,
> executes them in a real browser environment, and provides actionable
> insights.

## Project Status

  Area                               Status
  ---------------------------------- ----------------
  Next.js application                ✅ Implemented
  Clerk authentication               ✅ Implemented
  GitHub OAuth                       ✅ Implemented
  Fetch user's GitHub repositories   ✅ Implemented
  Repository selection UI            ✅ Implemented
  Repository persistence             ✅ Implemented
  Repository source-code ingestion   🔜 Next
  AI-powered test-case generation    🔜 Planned
  BrowserBase test execution         🔜 Planned
  Test result analysis               🔜 Planned
  AI-generated insights              🔜 Planned

This README is a living document and will be updated after each major
implementation phase.

------------------------------------------------------------------------

## 1. Overview

TestPilot is an agentic QA automation platform designed to reduce the
manual effort involved in creating, executing, and analyzing software
tests.

The intended workflow is:

``` text
GitHub Repository
       ↓
Repository Analysis
       ↓
Relevant Source Files
       ↓
AI Test-Case Generation
       ↓
Browser Automation Script
       ↓
Real Browser Execution
       ↓
Test Results
       ↓
AI-Powered Insights
```

The project combines full-stack web development, GitHub integration,
AI/LLM workflows, database persistence, and browser automation.

------------------------------------------------------------------------

## 2. Problem Statement

Traditional application testing often requires engineers or QA teams to
manually understand application code, identify user flows, write test
cases, convert them into automation scripts, execute them, inspect
failures, and repeat the process as the application changes.

TestPilot aims to automate this workflow by allowing an AI system to
inspect a repository and generate executable tests based on the actual
application structure and source code.

------------------------------------------------------------------------

## 3. Goals

-   Connect securely to a user's GitHub account.
-   Allow the user to select a repository.
-   Retrieve and analyze repository source code.
-   Identify relevant application routes, UI components, forms, APIs,
    and user flows.
-   Generate structured test cases using an AI model.
-   Convert test cases into browser automation scripts.
-   Execute scripts in a real/cloud browser environment.
-   Store execution results and logs.
-   Analyze failures and generate actionable insights.
-   Maintain test history for repositories.

------------------------------------------------------------------------

## 4. Planned End-to-End Architecture

``` text
                         Workspace
                            ↓
                     Connect GitHub
                            ↓
                    Select Repository
                            ↓
                   Scan Repository
                       using AI
                            ↓
                    Generate Tests
                            ↓
                 Run Tests in Browser
                            ↓
                     Return Results
```

External services:

``` text
GitHub        → repository access
Clerk         → application authentication
Neon          → PostgreSQL persistence
AI Model      → test-case generation and analysis
BrowserBase   → browser execution
```

------------------------------------------------------------------------

## 5. Technology Stack

### Frontend

-   Next.js 16
-   React 19
-   TypeScript
-   Tailwind CSS
-   Lucide React

### Backend

-   Next.js App Router API routes
-   TypeScript
-   Native `fetch` / Axios where appropriate

### Authentication

-   Clerk
-   GitHub OAuth

### Database

-   PostgreSQL
-   Neon
-   Drizzle ORM
-   Drizzle Kit

### AI and Automation

-   AI model for repository analysis and test generation
-   BrowserBase for planned cloud browser execution

------------------------------------------------------------------------

## 6. Current Project Structure

``` text
TestPilot/
├── app/
│   ├── api/
│   │   ├── github/
│   │   │   ├── route.ts
│   │   │   └── callback/
│   │   │       └── route.ts
│   │   ├── repositories/
│   │   │   └── route.ts
│   │   └── users/
│   │       └── route.ts
│   ├── sign-in/
│   ├── sign-up/
│   ├── workspace/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── provider.tsx
├── components/
│   └── custom/
│       ├── EmptyWorkSpace.tsx
│       ├── RepoDetails.tsx
│       ├── WorkSpaceBody.tsx
│       └── WorkSpaceHeader.tsx
├── context/
│   └── userDetail.tsx
├── db/
│   ├── index.ts
│   └── schema.ts
├── lib/
└── public/
```

------------------------------------------------------------------------

# 7. Phase 1 --- Authentication, GitHub Integration & Repository Connection

**Status: Complete ✅**

Phase 1 established the foundation required for TestPilot to work with
real GitHub repositories.

## 7.1 Application Authentication

TestPilot uses Clerk for authentication.

``` text
User
 ↓
Clerk Sign In / Sign Up
 ↓
Authenticated Clerk Session
 ↓
TestPilot
```

Clerk handles authentication and session management while TestPilot
stores application-specific data in its own database.

------------------------------------------------------------------------

## 7.2 GitHub OAuth

The GitHub connection flow is:

``` text
TestPilot
   ↓
/api/github
   ↓
GitHub OAuth Authorization
   ↓
User grants permission
   ↓
GitHub redirects to callback
   ↓
/api/github/callback
   ↓
Authorization code exchanged for access token
```

The OAuth access token is required because TestPilot will eventually
need to read repository contents.

### Why OAuth?

OAuth allows GitHub to authenticate and authorize the user without
TestPilot handling the user's GitHub password.

------------------------------------------------------------------------

## 7.3 GitHub Access Token

The access token is stored in an `httpOnly` cookie named:

``` text
github_token
```

The cookie is configured with secure settings including:

-   `httpOnly`
-   `secure` in production
-   `sameSite: "lax"`
-   root path
-   one-week expiration in the current implementation

The server can use the token while browser JavaScript cannot directly
read it.

The architecture is:

``` text
Browser
   ↓
TestPilot Server
   ↓
GitHub API
```

rather than exposing the GitHub token to React.

------------------------------------------------------------------------

## 7.4 Fetching GitHub Repositories

TestPilot provides:

``` http
GET /api/github/repos
```

The route:

1.  Reads the `github_token` cookie.
2.  Returns `401` when GitHub is not connected.
3.  Calls GitHub's repository API using the token.
4.  Returns repository metadata to the frontend.

The response includes:

-   GitHub repository ID
-   repository name
-   full name
-   owner
-   URL
-   default branch
-   public/private state
-   description
-   language
-   updated timestamp

This was tested successfully with the user's real GitHub repositories.

------------------------------------------------------------------------

## 7.5 Repository Selection

The workspace now displays the real repositories returned by GitHub.

The user can:

1.  View repositories.
2.  Select exactly one repository.
3.  Click **Connect Repository**.
4.  See the selected repository in `RepoDetails`.

The previous fake `setTimeout` connection flow was removed in favor of
real GitHub repository data.

------------------------------------------------------------------------

## 7.6 Database Design

TestPilot uses Neon PostgreSQL with Drizzle ORM.

### `users`

``` text
users
├── id
├── name
├── email
├── createdAt
└── credits
```

### `repositories`

``` text
repositories
├── id
├── userId
├── githubRepoId
├── name
├── fullName
├── owner
├── url
├── defaultBranch
├── isPrivate
├── description
├── language
├── connectedAt
└── lastSync
```

------------------------------------------------------------------------

## 7.7 Repository Relationship

``` text
users
  │
  │ 1
  │
  │ N
  ▼
repositories
```

`repositories.userId` is a foreign key referencing `users.id`.

Cascade deletion is enabled so repositories belonging to a deleted
application user can be removed automatically.

------------------------------------------------------------------------

## 7.8 Preventing Duplicate Connections

The repository table has a composite unique constraint:

``` text
(userId, githubRepoId)
```

This means the same TestPilot user cannot connect the same GitHub
repository twice.

It was explicitly tested:

``` text
First POST
   ↓
201 Created
   ↓
Repository inserted

Same POST again
   ↓
409 Conflict
   ↓
Repository already connected
```

This confirms that the database constraint and duplicate handling work
correctly.

------------------------------------------------------------------------

## 7.9 Repository Persistence API

The repository connection endpoint is:

``` http
POST /api/repositories
```

The endpoint:

1.  Authenticates the request using Clerk.
2.  Finds the application user using the Clerk user's primary email.
3.  Validates the supplied GitHub repository.
4.  Inserts the repository into PostgreSQL.
5.  Handles duplicate connections using the unique constraint.
6.  Returns the persisted repository.

Successful creation returns:

``` text
201 Created
```

Duplicate connection returns:

``` text
409 Conflict
```

An unauthenticated request returns:

``` text
401 Unauthorized
```

------------------------------------------------------------------------

## 7.10 Thunder Client Authentication Note

The repository POST endpoint returned `401 Unauthorized` when called
from Thunder Client because Thunder Client does not automatically share
the browser's active Clerk session.

The same endpoint successfully returned `201 Created` from the
authenticated browser session.

This is expected because Clerk authentication depends on the session
available to the client making the request.

------------------------------------------------------------------------

# 8. Current API Surface

  ------------------------------------------------------------------------------
  Method            Endpoint                 Purpose           Status
  ----------------- ------------------------ ----------------- -----------------
  GET               `/api/github`            Start GitHub      ✅
                                             OAuth             

  GET               `/api/github/callback`   Handle GitHub     ✅
                                             OAuth callback    

  GET               `/api/github/repos`      Fetch user's      ✅
                                             GitHub            
                                             repositories      

  POST              `/api/users`             Synchronize Clerk ✅
                                             user with         
                                             application DB    

  POST              `/api/repositories`      Persist selected  ✅
                                             repository        
  ------------------------------------------------------------------------------

------------------------------------------------------------------------

# 9. Phase 2 --- Repository Ingestion

**Status: Next**

The next major phase is to make TestPilot actually read and understand
the connected repository.

Planned flow:

``` text
Connected Repository
        ↓
GitHub Repository Tree
        ↓
getRepoTree()
        ↓
Filter relevant files
        ↓
readFileContent()
        ↓
Source Code Context
```

The ingestion layer should avoid unnecessary content such as build
output, dependencies, binary files, and other files that are not useful
for test generation.

The resulting context will become input to the AI test-generation
pipeline.

------------------------------------------------------------------------

# 10. Planned AI Test Generation

The planned test generation pipeline is:

``` text
getRepoTree()
      ↓
readFileContent()
      ↓
File Content
      +
AI Prompt
      ↓
AI Model
      ↓
Structured Test Cases
```

Each generated test case is intended to contain:

``` text
title
description
type
priority
targetRoute
targetFiles
expectedResult
```

Potential test types include:

-   UI
-   auth
-   API
-   form
-   integration
-   edge-case

The AI should generate tests based on files and routes that actually
exist in the repository rather than inventing application structure.

------------------------------------------------------------------------

# 11. Planned Browser Execution

The planned execution pipeline is:

``` text
Test Case
     ↓
Check for existing BrowserBase script
     ↓
Generate script if necessary
     ↓
Create BrowserBase session
     ↓
Execute script
     ↓
Collect result and logs
```

The generated script is intended to navigate the target application and
perform the actions described by the test case.

------------------------------------------------------------------------

# 12. Planned AI Insight Pipeline

After execution:

``` text
Test Result
+
Logs
+
Relevant Source
+
Evidence
      ↓
AI Analysis
      ↓
Failure Explanation
+
Actionable Insight
```

The objective is to provide more than a simple pass/fail result.

TestPilot should eventually explain:

-   what failed
-   where it failed
-   likely cause
-   relevant application behavior
-   useful debugging information

------------------------------------------------------------------------

# 13. Planned Agentic Architecture

The overall system is intended to become an agentic workflow:

``` text
Repository Agent
      ↓
Understand Codebase
      ↓
Test Planning / Generation Agent
      ↓
Structured Test Cases
      ↓
Execution Agent
      ↓
Test Results
      ↓
Analysis Agent
      ↓
Insights
```

The exact agent boundaries may evolve as implementation progresses.

The project intentionally separates repository understanding, test
generation, execution, and analysis so each stage can be independently
tested and improved.

------------------------------------------------------------------------

# 14. Security Considerations

Current security measures include:

-   GitHub OAuth secrets remain server-side.
-   GitHub access token is stored in an `httpOnly` cookie.
-   GitHub API access occurs through server-side routes.
-   Clerk handles application authentication.
-   Repository ownership is represented with a database foreign key.
-   Duplicate repository connections are prevented at the database
    level.

Future security work includes:

-   Token expiration/revocation handling
-   Least-privilege GitHub permissions
-   Protection against prompt injection from repository files
-   Sandboxing generated scripts
-   Rate limiting
-   Secure handling of source code and execution logs
-   Restricting browser automation to intended targets

------------------------------------------------------------------------

# 15. Development Roadmap

``` text
Phase 1 — GitHub Integration
├── Clerk authentication                 ✅
├── GitHub OAuth                         ✅
├── Fetch repositories                   ✅
├── Repository selection                 ✅
├── Repository database schema           ✅
└── Persist selected repository          ✅

Phase 2 — Repository Ingestion
├── Repository tree retrieval             🔜
├── File filtering                        🔜
├── File content retrieval                🔜
└── AI-ready repository context           🔜

Phase 3 — AI Test Generation
├── Prompt design                         🔜
├── Structured output                     🔜
├── Test-case validation                  🔜
├── Database persistence                  🔜
└── Test management UI                    🔜

Phase 4 — Browser Execution
├── BrowserBase integration               🔜
├── Browser script generation             🔜
├── Browser session creation              🔜
├── Test execution                        🔜
└── Execution logs                        🔜

Phase 5 — Result Analysis
├── Result processing                     🔜
├── Failure analysis                      🔜
├── AI-generated insights                 🔜
└── Test history                          🔜

Phase 6 — Production Hardening
├── Security improvements                 🔜
├── Rate limiting                         🔜
├── Observability                         🔜
└── Deployment                            🔜
```

------------------------------------------------------------------------

# 16. Placement / Interview Knowledge

Phase 1 currently demonstrates practical experience with:

-   Next.js App Router
-   React client/server boundaries
-   TypeScript
-   REST APIs
-   OAuth concepts
-   Clerk authentication
-   GitHub API integration
-   HTTP-only cookies
-   PostgreSQL
-   Neon
-   Drizzle ORM
-   Foreign keys
-   Composite unique constraints
-   HTTP status codes
-   API validation
-   Error handling
-   Full-stack state management

Future phases will add:

-   Repository/code ingestion
-   LLM-based code understanding
-   Structured LLM output
-   AI test generation
-   Browser automation
-   Cloud browser execution
-   Agentic workflows
-   AI-based failure analysis

------------------------------------------------------------------------

# 17. Development Methodology

TestPilot is being developed incrementally.

Each major phase follows:

``` text
Design
  ↓
Implementation
  ↓
Testing
  ↓
Debugging
  ↓
Documentation
  ↓
Next Phase
```

The objective is not only to produce a working application but to
understand the engineering decisions behind every major component.

------------------------------------------------------------------------

# 18. Current Milestone

## Phase 1 --- Complete

TestPilot can now:

``` text
Sign in
   ↓
Connect GitHub
   ↓
Retrieve real GitHub repositories
   ↓
Select a repository
   ↓
Persist the repository
   ↓
Prevent duplicate connections
```

## Next milestone

### Phase 2 --- Repository Ingestion

``` text
Connected Repository
        ↓
GitHub Repository Tree
        ↓
Relevant Files
        ↓
Source Code
        ↓
AI-ready Repository Context
```
