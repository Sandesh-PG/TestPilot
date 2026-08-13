# API Reference

TestPilot uses Next.js App Router API routes for server-side application functionality.

## Conventions

The API uses standard HTTP status codes and JSON responses.

Authentication is handled at the API layer where required:

- Clerk identifies the authenticated TestPilot user.
- GitHub OAuth provides the GitHub access token used for GitHub API requests.

---

## GitHub OAuth

### Start GitHub OAuth

```http
GET /api/github
GET /api/github/tree
```

Starts the GitHub OAuth authorization flow.

The route constructs a GitHub authorization URL using the configured:

- `GITHUB_CLIENT_ID`
- `GITHUB_REDIRECT_URI`

It then redirects the browser to GitHub.

---

### GitHub OAuth Callback

```http
GET /api/github/callback
```

Handles GitHub's OAuth callback.

Expected query parameter:

```text
code
```

The route exchanges the authorization code for a GitHub access token and stores the token in the `github_token` httpOnly cookie.

### Error responses

The callback redirects to `/workspace` with an error query parameter when the OAuth flow cannot be completed.

Examples:

```text
/workspace?error=missing_code
/workspace?error=missing_github_config
/workspace?error=token_exchange_failed
/workspace?error=token_missing
```

---

## GitHub Repositories

### List GitHub Repositories

```http
GET /api/github/repos
```

Returns repositories available to the authenticated GitHub account.

The route reads the `github_token` cookie and uses it to request repository information from GitHub.

### Authentication

Requires a valid:

```text
github_token
```

cookie.

If the GitHub token is unavailable, the route returns an authentication error.

### Example response

```json
{
  "repositories": [
    {
      "id": 1038602976,
      "name": "Lost_and_Found_RIT",
      "full_name": "Sandesh-PG/Lost_and_Found_RIT",
      "owner": {
        "login": "Sandesh-PG"
      },
      "html_url": "https://github.com/Sandesh-PG/Lost_and_Found_RIT",
      "default_branch": "main",
      "private": false,
      "description": "...",
      "language": "JavaScript",
      "updated_at": "2026-05-07T07:12:52Z"
    }
  ]
}
```

The exact response fields depend on the repository data returned by GitHub and the API route's response mapping.

---

## Repository Connection

### Connect a Repository

```http
POST /api/repositories
```

Persists a selected GitHub repository as a TestPilot repository connection.

### Authentication

The endpoint uses Clerk to identify the current TestPilot user.

The authenticated Clerk user's primary email is used to locate the corresponding application user in the `users` table.

### Request Body

```json
{
  "repository": {
    "id": 1038602976,
    "name": "Lost_and_Found_RIT",
    "full_name": "Sandesh-PG/Lost_and_Found_RIT",
    "owner": {
      "login": "Sandesh-PG"
    },
    "html_url": "https://github.com/Sandesh-PG/Lost_and_Found_RIT",
    "default_branch": "main",
    "private": false,
    "description": "...",
    "language": "JavaScript",
    "updated_at": "2026-05-07T07:12:52Z"
  }
}
```

### Processing

The endpoint:

1. Gets the current Clerk user.
2. Obtains the user's primary email.
3. Finds the corresponding row in `users`.
4. Validates the repository payload.
5. Inserts the repository into `repositories`.
6. Handles duplicate connections.
7. Returns the persisted repository.

### Success

```text
201 Created
```

Example:

```json
{
  "repository": {
    "id": 1,
    "userId": 1,
    "githubRepoId": 1038602976,
    "name": "Lost_and_Found_RIT",
    "fullName": "Sandesh-PG/Lost_and_Found_RIT",
    "owner": "Sandesh-PG",
    "url": "https://github.com/Sandesh-PG/Lost_and_Found_RIT",
    "defaultBranch": "main",
    "isPrivate": false
  }
}
```

### Unauthorized

```text
401 Unauthorized
```

Returned when there is no authenticated Clerk user or the request cannot be associated with an authenticated application user.

### Application User Not Found

```text
404 Not Found
```

Returned when the Clerk user exists but no corresponding application user record exists.

### Invalid Request

```text
400 Bad Request
```

Returned when required repository information is missing or invalid.

### Duplicate Repository

```text
409 Conflict
```

Returned when the same TestPilot user has already connected the same GitHub repository.

This behavior is backed by the database's composite unique constraint:

```text
(user_id, github_repo_id)
```

---

## Current API Surface

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/github` | Start GitHub OAuth |
| GET | `/api/github/callback` | Complete GitHub OAuth |
| GET | `/api/github/repos` | Retrieve GitHub repositories |
| POST | `/api/repositories` | Persist a selected repository |
| POST | `/api/users` | Synchronize application user data |

Additional endpoints will be documented here as repository ingestion, test generation, browser execution, and result analysis are implemented.

## API Testing

During development, API routes can be tested from the authenticated browser environment or an API client.

A browser request automatically includes the active Clerk session. A separate API client such as Thunder Client does not automatically share that browser session, so authenticated Clerk-protected endpoints may return `401 Unauthorized` unless the client is configured with appropriate authentication.

The repository persistence endpoint was verified with:

```text
First request  → 201 Created
Second request → 409 Conflict
```

confirming both successful persistence and duplicate protection.


---

## Repository Tree

### Get Repository Tree

```http
GET /api/github/tree?owner=<owner>&repo=<repo>&branch=<branch>
```

Retrieves the recursive GitHub repository tree for the specified branch.

The endpoint uses the existing server-side GitHub access token and returns a normalized representation of the repository tree.

### Filtered Tree

The endpoint also supports:

```http
GET /api/github/tree?owner=<owner>&repo=<repo>&branch=<branch>&filtered=true
```

When `filtered=true`, the endpoint returns only files selected for application analysis. Directory entries, common generated/dependency directories, binary artifacts, lockfiles, and environment/secret files are excluded according to the repository file-filtering rules.

### Raw Response

```json
{
  "repository": "owner/repo",
  "branch": "main",
  "tree": [
    {
      "path": "app/page.tsx",
      "type": "blob",
      "sha": "...",
      "size": 1234
    }
  ]
}
```

### Filtered Response

```json
{
  "repository": "owner/repo",
  "branch": "main",
  "files": [
    {
      "path": "app/page.tsx",
      "type": "blob",
      "sha": "...",
      "size": 1234
    }
  ]
}
```

Only file metadata is returned at this stage. File contents are retrieved in a later repository-ingestion step.
