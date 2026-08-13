# Database

TestPilot uses **PostgreSQL hosted on Neon** with **Drizzle ORM** for database access and schema management.

The database currently stores application users and their connected GitHub repositories.

## Current Schema

```text
users
  │
  │ 1 : N
  ▼
repositories
```

## `users`

The `users` table stores TestPilot-specific user information.

| Column | Type | Constraints | Purpose |
|---|---|---|---|
| `id` | serial | Primary key | Internal application user ID |
| `name` | text | Nullable | User's name |
| `email` | text | Not null, unique | Application user email |
| `created_at` | timestamp | Not null, default now | Account creation time |
| `credits` | integer | Not null, default 10 | TestPilot usage credits |

The local user record is separate from Clerk's authentication data. Clerk identifies the authenticated user, while this table stores application-specific state.

## `repositories`

The `repositories` table stores GitHub repositories connected to TestPilot users.

| Column | Type | Constraints | Purpose |
|---|---|---|---|
| `id` | serial | Primary key | Internal repository record ID |
| `user_id` | integer | Not null, foreign key | TestPilot user who connected the repository |
| `github_repo_id` | integer | Not null | GitHub's repository ID |
| `name` | text | Not null | Repository name |
| `full_name` | text | Not null | GitHub full repository name |
| `owner` | text | Not null | GitHub owner/login |
| `url` | text | Not null | GitHub repository URL |
| `default_branch` | text | Not null | Repository default branch |
| `is_private` | boolean | Not null, default false | GitHub visibility |
| `description` | text | Nullable | Repository description |
| `language` | text | Nullable | Repository language reported by GitHub |
| `connected_at` | timestamp | Not null, default now | Time the repository was connected |
| `last_sync` | timestamp | Nullable | Last repository synchronization time |

## Relationships

`repositories.user_id` references `users.id`.

```text
users.id
   ▲
   │
   │ foreign key
   │
repositories.user_id
```

The relationship is one-to-many:

```text
One TestPilot user
        │
        ├── Repository A
        ├── Repository B
        └── Repository C
```

The foreign key uses cascade deletion. If an application user is deleted, their connected repository records can be deleted automatically.

## Internal ID vs GitHub ID

The repository table contains two different IDs:

```text
id
```

is TestPilot's internal database identifier.

```text
github_repo_id
```

is the identifier assigned to the repository by GitHub.

Keeping these separate allows TestPilot to maintain its own database identity while retaining the external GitHub identifier needed for GitHub API operations.

## Duplicate Repository Protection

The database defines a composite unique index on:

```text
(user_id, github_repo_id)
```

This means the same TestPilot user cannot create multiple repository records for the same GitHub repository.

Example:

```text
User 1 + GitHub Repo 123
```

can exist only once.

A second attempt to connect the same repository is handled by the API as a conflict and returns:

```text
409 Conflict
```

## Schema Management

The project uses Drizzle Kit.

Current commands include:

```bash
npm run db:generate
npm run db:push
npm run db:studio
```

`db:push` was used to apply the current schema successfully to the Neon PostgreSQL database.

## Current Database Scope

The database currently represents the beginning of the TestPilot data model.

Future functionality is expected to introduce additional entities for generated test cases, browser automation scripts, test executions, execution logs, and analysis results. Those entities will be documented here when they are implemented.
