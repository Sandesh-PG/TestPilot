# Test Generation Layer

This layer sits after repository ingestion and repository analysis. It receives a validated repository context and a structured repository analysis, then produces a compact set of high-value, behavior-oriented test cases.

## Purpose

The goal is not to execute tests or generate browser automation. The goal is to identify what is worth testing based on the repository evidence that is already available.

This layer converts repository evidence into a machine-readable set of test scenarios that can be used by later execution and automation phases.

## Architecture

The pipeline is intentionally layered:

1. GitHub repository tree retrieval
2. File filtering
3. File content retrieval
4. RepositoryContext assembly
5. RepositoryAnalysis
6. Test case generation

This phase only handles step 6.

## Inputs

The generator receives:

- RepositoryContext
- RepositoryAnalysis

Both are server-side objects built from the repository ingestion pipeline. They are already filtered, validated, and framework-agnostic.

## Generated test-case schema

Each generated test case contains:

- title
- description
- type
- priority
- targetRoute
- targetFiles
- expectedResult

The overall response is:

```json
{
  "testCases": [
    {
      "title": "User can connect a GitHub repository",
      "description": "An authenticated user can select and connect a repository.",
      "type": "ui",
      "priority": "high",
      "targetRoute": "/workspace",
      "targetFiles": ["components/custom/WorkSpaceBody.tsx"],
      "expectedResult": "The selected repository becomes connected and is displayed in the workspace."
    }
  ]
}
```

## Groq integration

The generator uses the shared Groq integration from the AI layer. It does not create a second provider client and does not hardcode the model.

The configured model is stored centrally and remains changeable without altering test-generation logic.

## Evidence grounding

The model is instructed to use only the supplied RepositoryContext and RepositoryAnalysis. It must never invent:

- routes
- files
- API endpoints
- features
- user workflows
- authentication behavior

The system prompt states that it is generating behavior-oriented test cases based on evidence, not implementation details.

## Hallucination validation

Generated test cases are validated in application code before they are returned. The validation ensures:

- each targetRoute exists in RepositoryAnalysis
- each targetFile exists in RepositoryContext
- required fields are present and non-empty
- type values are valid
- priority values are valid
- duplicate scenarios are rejected

If no evidence-grounded tests pass validation, the server returns a controlled error instead of silently fabricating output.

## Duplicate prevention

The generator canonicalizes titles and rejects repeated scenarios. This reduces repeated variations such as:

- repository connection works
- user can connect a repository
- successful repository connection

Only one scenario is kept when they describe the same behavior.

## API endpoint

GET /api/github/test-cases?owner=<owner>&repo=<repo>&branch=<branch>

The route authenticates the current user, assembles repository context, analyzes it, generates test cases, validates them, and returns the structured response.

## Security considerations

- The Groq API key remains server-side only.
- No GitHub tokens are returned.
- No environment variables or secret files are sent to the model.
- The existing filtering pipeline avoids .env and secret-bearing files from repository context.

## Structured output

The model is asked to return a JSON object with a `testCases` array. The application continues to enforce the expected schema and rejects any malformed fields before returning the result.

## Limitations

This layer intentionally does not:

- execute tests
- generate browser scripts
- produce BrowserBase sessions
- launch Playwright
- persist generated scenarios to the database

It is a structured test-generation layer only, designed to produce high-value candidate scenarios before any execution or automation layer is introduced.
