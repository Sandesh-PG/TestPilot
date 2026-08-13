# Repository Ingestion

Repository ingestion is the stage where TestPilot begins inspecting a connected GitHub repository.

## Current Pipeline

```text
Connected Repository
        ↓
GitHub Repository Tree
        ↓
File Filtering
        ↓
Selected File Metadata
        ↓
File Content Retrieval
```

File content retrieval is the next step; the current implementation does not yet read file contents.

## Repository Tree Retrieval

TestPilot retrieves the recursive GitHub repository tree for a selected branch.

```text
/api/github/tree
        ↓
Server-side GitHub token
        ↓
GitHub Git Trees API
        ↓
Normalized repository tree
```

Each tree entry contains metadata such as:

- `path`
- `type`
- `sha`
- `size` when available

GitHub tree entries use:

```text
tree → directory
blob → file
```

For example:

```text
app/                         → tree
app/api/                     → tree
app/api/github/route.ts      → blob
package.json                 → blob
```

The endpoint returns repository structure and metadata only; it does not expose the GitHub access token or source-code contents.

## File Filtering

The repository tree is filtered before source files are retrieved.

The filter:

- accepts the normalized GitHub tree
- ignores directory entries in the final file list
- excludes common generated/dependency-heavy directories
- excludes obvious binary and non-source artifacts
- retains likely application source files
- retains useful project metadata/configuration
- excludes common lockfiles
- excludes `.env` and `.env.*` files

### Excluded Directories

Examples include:

```text
node_modules/
.git/
.next/
dist/
build/
coverage/
out/
vendor/
```

### Source Files

Common supported source extensions include:

```text
.ts
.tsx
.js
.jsx
.py
.java
.go
.rs
.rb
.php
.cs
.c
.cpp
.h
.hpp
.vue
.svelte
```

### Project Metadata

Examples of preserved metadata/configuration files:

```text
package.json
README.md
requirements.txt
pyproject.toml
pom.xml
build.gradle
Cargo.toml
go.mod
composer.json
Dockerfile
```

### Excluded Files

Examples include:

```text
package-lock.json
yarn.lock
pnpm-lock.yaml
.env
.env.*
```

The filter is framework-agnostic and does not assume that every repository is a Next.js project.

## API

### Raw tree

```http
GET /api/github/tree?owner=<owner>&repo=<repo>&branch=<branch>
```

Returns the normalized recursive tree.

### Filtered files

```http
GET /api/github/tree?owner=<owner>&repo=<repo>&branch=<branch>&filtered=true
```

Returns:

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

No file contents are returned at this stage.

## Why Filtering Comes First

Repository trees may contain dependencies, generated output, binaries, lockfiles, and other data that is not useful for application analysis.

Filtering before content retrieval helps:

- reduce unnecessary GitHub API requests
- reduce data-processing overhead
- reduce future LLM token usage
- improve signal-to-noise ratio
- avoid unnecessarily processing environment files
- keep generated/dependency-heavy content out of the analysis context

## Framework-Agnostic Design

A connected repository may be a:

- Python service
- Java application
- Go service
- Rust project
- PHP application
- Vue application
- Svelte application
- multi-language repository

The filtering strategy therefore uses broad source-file and project-metadata heuristics rather than assuming a single framework.

## Implementation

Current implementation:

```text
lib/github/repository.ts
    → repository tree retrieval

lib/github/fileFilter.ts
    → file filtering

app/api/github/tree/route.ts
    → raw and filtered tree API
```

The next step is retrieving the contents of the accepted files so TestPilot can construct a repository context for AI analysis.
