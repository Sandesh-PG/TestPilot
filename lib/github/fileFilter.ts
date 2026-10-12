import type { RepositoryTreeItem } from './repository';

const EXCLUDED_DIRECTORIES = new Set([
    'node_modules',
    '.git',
    '.next',
    'dist',
    'build',
    'coverage',
    'out',
    'vendor',
    '__pycache__',
    '.venv',
    'venv',
    '.idea',
    '.vscode',
    '.cache',
]);

const LOCKFILE_NAMES = new Set([
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'bun.lockb',
    'bun.lock',
    'npm-shrinkwrap.json',
]);

const EXCLUDED_EXTENSIONS = new Set([
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.svg',
    '.webp',
    '.ico',
    '.bmp',
    '.pdf',
    '.zip',
    '.gz',
    '.tar',
    '.tgz',
    '.rar',
    '.7z',
    '.xz',
    '.bz2',
    '.mp3',
    '.mp4',
    '.mov',
    '.avi',
    '.mkv',
    '.exe',
    '.dll',
    '.so',
    '.dylib',
    '.class',
    '.jar',
    '.war',
    '.ear',
    '.db',
    '.sqlite',
    '.sqlite3',
    '.wasm',
    '.ttf',
    '.woff',
    '.woff2',
    '.eot',
    '.pem',
    '.p12',
    '.pfx',
    '.crt',
    '.cer',
    '.key',
    '.jks',
    '.keystore',
]);

const SOURCE_EXTENSIONS = new Set([
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.py',
    '.java',
    '.go',
    '.rs',
    '.rb',
    '.php',
    '.cs',
    '.c',
    '.cpp',
    '.h',
    '.hpp',
    '.vue',
    '.svelte',
    '.ejs',
    '.html',
    '.htm',
    '.hbs',
    '.pug',
    '.kt',
    '.swift',
    '.scala',
    '.sql',
    '.sh',
    '.bash',
    '.zsh',
    '.yaml',
    '.yml',
    '.toml',
    '.ini',
    '.cfg',
    '.conf',
    '.json',
    '.xml',
    '.properties',
]);

const UI_TEMPLATE_EXTENSIONS = new Set([
    '.ejs',
    '.html',
    '.htm',
    '.jsx',
    '.tsx',
    '.vue',
    '.svelte',
    '.hbs',
    '.pug',
]);

const PRIORITY_DIRECTORIES = new Set([
    'views',
    'templates',
    'components',
    'pages',
]);

const KEEP_FILE_NAMES = new Set([
    'package.json',
    'README.md',
    'readme.md',
    'requirements.txt',
    'pyproject.toml',
    'pom.xml',
    'build.gradle',
    'build.gradle.kts',
    'settings.gradle',
    'settings.gradle.kts',
    'Cargo.toml',
    'go.mod',
    'composer.json',
    'Dockerfile',
    'docker-compose.yml',
    'docker-compose.yaml',
    'Makefile',
    'Procfile',
    'tsconfig.json',
    'jsconfig.json',
    'next.config.js',
    'vite.config.ts',
    'vite.config.js',
    'webpack.config.js',
    'webpack.config.ts',
    'babel.config.js',
    'jest.config.js',
    'jest.config.ts',
    'vitest.config.ts',
    'vitest.config.js',
    'playwright.config.ts',
    'playwright.config.js',
    'cypress.config.js',
    'cypress.config.ts',
    '.editorconfig',
    '.gitignore',
    '.dockerignore',
    '.npmrc',
    '.prettierrc',
    '.eslintrc',
    '.eslintrc.js',
    '.eslintrc.cjs',
    '.browserslistrc',
    '.nvmrc',
    '.tool-versions',
]);

function normalizePath(path: string): string {
    return path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

function getFileExtension(path: string): string {
    const fileName = path.split('/').pop() ?? '';
    const lastDot = fileName.lastIndexOf('.');

    if (lastDot <= 0 || lastDot === fileName.length - 1) {
        return '';
    }

    return fileName.slice(lastDot).toLowerCase();
}

function isSecretLikePath(path: string): boolean {
    const normalized = path.toLowerCase();
    const segments = normalized.split('/');

    if (segments.some((segment) => segment === '.env' || segment.startsWith('.env.'))) {
        return true;
    }

    if (normalized.includes('secret') || normalized.includes('token') || normalized.includes('password')) {
        return true;
    }

    return false;
}

function shouldExcludePath(path: string): boolean {
    const normalized = normalizePath(path);
    const segments = normalized.split('/');

    if (segments.some((segment) => EXCLUDED_DIRECTORIES.has(segment.toLowerCase()))) {
        return true;
    }

    const fileName = segments[segments.length - 1] ?? '';

    if (LOCKFILE_NAMES.has(fileName.toLowerCase())) {
        return true;
    }

    if (isSecretLikePath(normalized)) {
        return true;
    }

    const extension = getFileExtension(normalized);
    if (EXCLUDED_EXTENSIONS.has(extension)) {
        return true;
    }

    return false;
}

function isInterestingFile(path: string): boolean {
    const normalized = normalizePath(path);
    const segments = normalized.toLowerCase().split('/');
    const fileName = segments[segments.length - 1] ?? '';

    if (KEEP_FILE_NAMES.has(fileName)) {
        return true;
    }

    const lowerCaseName = fileName.toLowerCase();
    if (lowerCaseName.includes('config') && !LOCKFILE_NAMES.has(lowerCaseName)) {
        return true;
    }

    if (lowerCaseName === 'dockerfile' || lowerCaseName === 'makefile') {
        return true;
    }

    const extension = getFileExtension(normalized);

    // Prioritize and preserve UI template and view files
    if (segments.some((segment) => PRIORITY_DIRECTORIES.has(segment))) {
        if (SOURCE_EXTENSIONS.has(extension) || UI_TEMPLATE_EXTENSIONS.has(extension) || extension === '.json') {
            return true;
        }
    }

    if (UI_TEMPLATE_EXTENSIONS.has(extension)) {
        return true;
    }

    if (SOURCE_EXTENSIONS.has(extension)) {
        return true;
    }

    if (normalized.toLowerCase().endsWith('.md')) {
        return lowerCaseName === 'readme.md' || lowerCaseName === 'readme' || lowerCaseName.endsWith('readme.md');
    }

    if (normalized.toLowerCase().endsWith('.yml') || normalized.toLowerCase().endsWith('.yaml')) {
        return true;
    }

    if (normalized.toLowerCase().endsWith('.toml') || normalized.toLowerCase().endsWith('.ini')) {
        return true;
    }

    return false;
}

function getIngestionPriority(path: string): number {
    const normalized = normalizePath(path).toLowerCase();
    const segments = normalized.split('/');
    const fileName = segments[segments.length - 1] ?? '';
    const extension = getFileExtension(normalized);

    // Root manifests and documentation
    if (fileName === 'package.json' || fileName === 'readme.md') return 100;
    if (fileName.includes('config') || fileName === 'tsconfig.json') return 90;

    // Server entrypoints & routers
    if (/^(app|server|index)\.(js|ts|mjs|cjs)$/.test(fileName) || normalized.includes('/routes/') || normalized.includes('api/')) {
        return 85;
    }

    // Prioritize views/, templates/, components/, and pages/ folders
    if (segments.some((seg) => PRIORITY_DIRECTORIES.has(seg))) {
        return 80;
    }

    // UI and template extensions anywhere
    if (UI_TEMPLATE_EXTENSIONS.has(extension)) {
        return 75;
    }

    // Standard source files
    if (SOURCE_EXTENSIONS.has(extension)) {
        return 50;
    }

    return 20;
}

export function filterRepositoryFiles(tree: RepositoryTreeItem[]): RepositoryTreeItem[] {
    const accepted = new Map<string, RepositoryTreeItem>();

    for (const item of tree) {
        if (item.type !== 'blob') {
            continue;
        }

        const normalizedPath = normalizePath(item.path);
        if (!normalizedPath || shouldExcludePath(normalizedPath)) {
            continue;
        }

        if (!isInterestingFile(normalizedPath)) {
            continue;
        }

        if (!accepted.has(normalizedPath)) {
            accepted.set(normalizedPath, item);
        }
    }

    // Sort so prioritized folders (views, templates, components, pages) and entrypoints are ingested first
    return Array.from(accepted.values()).sort(
        (a, b) => getIngestionPriority(b.path) - getIngestionPriority(a.path)
    );
}
