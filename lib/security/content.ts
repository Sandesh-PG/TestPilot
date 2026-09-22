const SECRET_PATTERNS: RegExp[] = [
    /-----BEGIN(?: [A-Z]+)? PRIVATE KEY-----[\s\S]*?-----END(?: [A-Z]+)? PRIVATE KEY-----/gi,
    /\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password|passwd|database[_-]?url)\s*[:=]\s*(['"]?)[^\s'"`,;]+\1/gi,
    /\b(?:ghp|github_pat|glpat|sk|xox[baprs])_[A-Za-z0-9_\-]{12,}\b/g,
    /\bAKIA[0-9A-Z]{16}\b/g,
];

export const MAX_REPOSITORY_CONTEXT_FILES = 100;
export const MAX_REPOSITORY_CONTEXT_BYTES = 2_000_000;

export function redactSensitiveContent(content: string): string {
    return SECRET_PATTERNS.reduce(
        (redacted, pattern) => redacted.replace(pattern, '[REDACTED_SECRET]'),
        content
    );
}
