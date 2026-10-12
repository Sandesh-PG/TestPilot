# Authentication

TestPilot uses two authentication/authorization systems for different responsibilities:

- **Clerk** manages authentication for the TestPilot application.
- **GitHub OAuth** authorizes TestPilot to access the user's GitHub repositories.

## Application Authentication

Clerk is responsible for:

- Sign-up
- Sign-in
- Session management
- Identifying the authenticated TestPilot user

The application uses Clerk's server-side APIs when an API route needs to determine the current user.

The application also maintains a local `users` table. This table stores TestPilot-specific information such as credits and repository relationships.

The relationship is:

```text
Clerk
  │
  │ identifies the user
  ▼
TestPilot application user
  │
  │ stored in
  ▼
users table
```

Clerk remains the authentication provider; the local database stores application data.

## GitHub OAuth

GitHub OAuth is used when a user wants to connect GitHub to TestPilot.

The current flow is:

```text
User
  │
  ▼
TestPilot /api/github
  │
  ▼
GitHub OAuth authorization page
  │
  │ user authorizes access
  ▼
/api/github/callback?code=...
  │
  ▼
GitHub token exchange
  │
  ▼
GitHub access token
```

### Starting OAuth

`GET /api/github` constructs the GitHub authorization URL using:

- `GITHUB_CLIENT_ID`
- `GITHUB_REDIRECT_URI`
- requested scopes

The current OAuth scope includes repository access and user-read access.

### OAuth Callback

`GET /api/github/callback` receives the authorization code from GitHub.

The server:

1. Validates that a code was provided.
2. Reads the GitHub OAuth configuration from environment variables.
3. Sends the authorization code to GitHub's token endpoint.
4. Extracts the returned access token.
5. Stores the token in a server-readable cookie.
6. Redirects the user back to `/workspace`.

## GitHub Token Storage

The current implementation stores the GitHub access token in a cookie named:

```text
github_token
```

The cookie is configured as:

```text
httpOnly: true
secure: production only
sameSite: lax
path: /
maxAge: 7 days
```

The `httpOnly` setting prevents browser-side JavaScript from directly reading the GitHub access token.

The intended request flow is:

```text
Browser
   │
   │ request to TestPilot
   ▼
Next.js API Route
   │
   │ reads github_token
   ▼
GitHub API
```

The GitHub token is therefore handled by server-side API routes rather than being passed through React components.

## Authentication vs GitHub Authorization

These two systems solve different problems:

```text
Clerk
  ↓
"Who is using TestPilot?"

GitHub OAuth
  ↓
"What GitHub resources has this user authorized TestPilot to access?"
```

This separation allows TestPilot to use Clerk for application identity while using GitHub OAuth specifically for repository access.

## Current Error Handling

The GitHub OAuth routes redirect back to `/workspace` with an error query parameter when required information is missing or the token exchange fails.

Examples include:

```text
/workspace?error=missing_code
/workspace?error=missing_github_config
/workspace?error=token_exchange_failed
/workspace?error=token_missing
```

## Security Considerations

Current implementation considerations:

- GitHub OAuth client secrets are kept in environment variables.
- The GitHub access token is stored as an `httpOnly` cookie.
- GitHub API requests are made server-side.
- Clerk is responsible for application authentication.

Future security work includes token revocation/expiration handling, least-privilege GitHub permissions, stronger access-control checks around repository data, and protection against malicious repository content during AI processing.


## GitHub Token Usage During Repository Ingestion

The GitHub access token established through OAuth is reused by the repository-ingestion endpoints.

```text
GitHub OAuth
    ↓
github_token cookie
    ↓
Server-side GitHub utility
    ↓
Repository tree retrieval
```

The token remains server-side and is not included in repository-tree responses.
