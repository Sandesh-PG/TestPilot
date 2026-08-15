# Repository Ingestion

Repository ingestion is the server-side pipeline through which TestPilot reads a connected GitHub repository and prepares its source code for downstream analysis and AI-powered test generation.

The ingestion layer is intentionally separated from AI logic. Its responsibility is to discover relevant repository files, retrieve their contents safely, and assemble a normalized `RepositoryContext` that can be consumed by later stages.

## Architecture

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
        ↓
Repository Context Assembly
        ↓
AI / Test Generation
```

The ingestion layer does not generate tests, execute tests, call an LLM, or run BrowserBase sessions.

---

## Repository Tree Retrieval

TestPilot retrieves the recursive GitHub repository tree for a selected branch using the Git Trees API.

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

The endpoint returns repository structure and metadata only. The GitHub access token and source-code contents are never exposed by the tree endpoint.

### API

```http
GET /api/github/tree?owner=<owner>&repo=<repo>&branch=<branch>
```

Returns the normalized recursive repository tree.

---

## File Filtering

The repository tree is filtered before source files are retrieved.

The filtering layer:

- ignores directory entries in the final file list
- excludes common generated and dependency-heavy directories
- excludes obvious binary and non-source artifacts
- retains likely application source files
- retains useful project metadata and configuration
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

### Supported Source Files

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

Useful project and build metadata can be retained, including:

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

### API

```http
GET /api/github/tree?owner=<owner>&repo=<repo>&branch=<branch>&filtered=true
```

Returns the filtered file metadata:

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

No source-code contents are returned by this endpoint.

---

## File Content Retrieval

After filtering, TestPilot retrieves the contents of accepted files using GitHub's Contents API.

```text
Filtered file metadata
        ↓
GitHub Contents API
        ↓
Base64-encoded content
        ↓
UTF-8 source text
```

The implementation uses:

```http
GET https://api.github.com/repos/{owner}/{repo}/contents/{path}?ref={branch}
```

For a regular file, GitHub returns metadata and Base64-encoded content.

TestPilot:

1. verifies that the response represents a file
2. checks the configured file-size limit
3. removes whitespace from the Base64 payload
4. decodes it with Node's `Buffer`
5. stores the resulting UTF-8 source text
6. marks unsupported or oversized files as skipped instead of failing the entire ingestion

A successfully loaded file has a structure similar to:

```json
{
  "path": "app/page.tsx",
  "sha": "...",
  "size": 1234,
  "content": "..."
}
```

A skipped file is represented with a reason, for example:

```json
{
  "path": "src/large-file.ts",
  "sha": "...",
  "size": 10000000,
  "skipped": true,
  "reason": "file_too_large"
}
```

### Concurrency and Size Limits

Repository ingestion can involve many GitHub requests. The content layer therefore uses bounded concurrency instead of issuing an unlimited `Promise.all()` over every file.

This helps:

- avoid excessive simultaneous requests
- reduce the likelihood of GitHub rate-limit issues
- control server resource usage
- make ingestion more predictable

A maximum file-size limit also prevents unusually large files from consuming excessive memory or producing unusable downstream AI context.

Partial failures are represented in the response rather than causing the entire ingestion process to fail.

### API

```http
GET /api/github/files?owner=<owner>&repo=<repo>&branch=<branch>
```

The response contains loaded files and ingestion statistics:

```json
{
  "repository": "owner/repo",
  "branch": "main",
  "files": [
    {
      "path": "app/page.tsx",
      "sha": "...",
      "size": 1234,
      "content": "..."
    }
  ],
  "summary": {
    "totalFiles": 25,
    "loadedFiles": 23,
    "skippedFiles": 2
  }
}
```

All GitHub API communication and token handling remain server-side.

---

## Repository Context Assembly

The individual files returned by the ingestion layer are normalized into a repository-level `RepositoryContext`.

This creates a stable boundary between GitHub-specific ingestion logic and future AI/test-generation logic.

Conceptually:

```text
GitHub APIs
    ↓
Repository ingestion
    ↓
RepositoryContext
    ↓
AI analysis
```

The AI layer does not need to understand GitHub's tree API, Contents API, Base64 encoding, OAuth cookies, or request details.

### RepositoryContext

The current context contains:

```text
RepositoryContext
├── repository
├── owner
├── name
├── branch
├── project
│   ├── type
│   ├── primaryLanguage
│   └── packageManager
├── files
│   ├── path
│   ├── sha
│   ├── size
│   └── content
└── summary
    ├── totalFiles
    ├── loadedFiles
    ├── skippedFiles
    └── totalSize
```

Example:

```json
{
  "repository": "owner/repo",
  "owner": "owner",
  "name": "repo",
  "branch": "main",
  "project": {
    "type": "nextjs",
    "primaryLanguage": "typescript",
    "packageManager": "npm"
  },
  "files": [
    {
      "path": "app/page.tsx",
      "sha": "...",
      "size": 1234,
      "content": "..."
    }
  ],
  "summary": {
    "totalFiles": 25,
    "loadedFiles": 23,
    "skippedFiles": 2,
    "totalSize": 45678
  }
}
```

### Project Type Detection

Project type detection is deterministic and based on project markers already present in the loaded repository files.

Examples:

```text
package.json                 → node / react / nextjs
requirements.txt             → python
pyproject.toml               → python
pom.xml                      → java
build.gradle                 → java
build.gradle.kts             → java
go.mod                       → go
Cargo.toml                   → rust
composer.json                → php
```

For JavaScript/TypeScript projects, `package.json` is inspected for framework indicators so a project can be classified more specifically, such as `nextjs` or `react`.

If no recognized marker is found, the project type falls back to:

```text
generic
```

This detection is intentionally lightweight and does not use an LLM.

### Primary Language Detection

The primary language is inferred from the extensions of accepted source files.

Examples:

```text
.ts / .tsx       → TypeScript
.js / .jsx       → JavaScript
.py              → Python
.java            → Java
.go              → Go
.rs              → Rust
.php             → PHP
.cs              → C#
.c / .cpp / .h   → C/C++
.vue             → Vue
.svelte          → Svelte
```

The language with the strongest representation in the accepted file set is selected as the primary language.

This is a heuristic used for repository metadata, not a substitute for full code analysis.

### Context API

```http
GET /api/github/context?owner=<owner>&repo=<repo>&branch=<branch>
```

This endpoint composes the existing ingestion pipeline:

```text
GitHub tree
    ↓
file filtering
    ↓
file content retrieval
    ↓
RepositoryContext assembly
```

The route reuses the existing server-side ingestion utilities rather than duplicating GitHub API logic.

The context is currently assembled in memory and is not persisted to PostgreSQL.

---

## Why Filtering Comes Before Content Retrieval

Repository trees may contain dependencies, generated output, binaries, lockfiles, and other data that is not useful for application analysis.

Filtering before content retrieval helps:

- reduce unnecessary GitHub API requests
- reduce data-processing overhead
- reduce future LLM token usage
- improve signal-to-noise ratio
- avoid unnecessarily processing environment files
- keep generated and dependency-heavy content out of the analysis context

This also provides a natural security boundary before source code enters later AI-processing stages.

---

## Why RepositoryContext Exists

`RepositoryContext` provides a stable, framework-agnostic contract for the next layer of TestPilot.

Without this abstraction, AI code would need to know how to:

- authenticate with GitHub
- retrieve repository trees
- filter files
- call the Contents API
- decode Base64
- handle skipped files
- detect project metadata

With the abstraction:

```text
GitHub / ingestion implementation
                ↓
        RepositoryContext
                ↓
      AI / test generation
```

The AI layer can focus on understanding application behavior and generating tests rather than repository transport and ingestion concerns.

The context is also serializable, which makes it suitable for future caching, chunking, or model-specific transformations.

---

## API Summary

| Endpoint | Purpose |
|---|---|
| `GET /api/github/tree` | Retrieve the raw recursive repository tree |
| `GET /api/github/tree?filtered=true` | Retrieve filtered file metadata |
| `GET /api/github/files` | Retrieve contents of accepted files |
| `GET /api/github/context` | Assemble the complete repository context |

---

## Implementation

The repository-ingestion implementation is organized into reusable server-side modules:

```text
lib/github/repository.ts
    → GitHub repository/tree retrieval

lib/github/fileFilter.ts
    → source-file and metadata filtering

lib/github/fileContent.ts
    → file-content retrieval, decoding,
      size limits, and bounded concurrency

lib/github/context.ts
    → RepositoryContext assembly and
      project/language detection

app/api/github/tree/route.ts
    → raw and filtered tree API

app/api/github/files/route.ts
    → file-content API

app/api/github/context/route.ts
    → RepositoryContext API
```

The ingestion layer does not contain AI or browser-execution logic. It produces the repository context consumed by the downstream test-generation system.
