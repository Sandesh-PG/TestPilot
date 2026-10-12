import type { RepositoryContext, RepositoryFile } from '@/lib/repository/context';

export type RouteSurface = {
    path: string;
    sourceFiles: string[];
    type: 'page' | 'api' | 'unknown';
};

export type ApiSurface = {
    route: string;
    methods: string[];
    sourceFiles: string[];
};

export type InteractionSurface = {
    name: string;
    evidence: string[];
    sourceFiles: string[];
};

export type TestableSurface = {
    path: string;
    sourceFiles: string[];
    type: 'page' | 'api' | 'unknown';
    methods: string[];
    evidence: string[];
};

export type DiscoveredDomElement = {
    selector: string;
    tag: string;
    id?: string;
    classes?: string[];
    name?: string;
    type?: string;
    action?: string;
    sourceFile: string;
    description?: string;
};

export type RepositoryAnalysis = {
    framework?: string;
    language?: string;
    packageManager?: string;

    routes: RouteSurface[];

    apiEndpoints: ApiSurface[];

    testableSurfaces: TestableSurface[];

    authentication: {
        detected: boolean;
        evidence: string[];
    };

    interactions: InteractionSurface[];

    importantFiles: string[];

    domElements: DiscoveredDomElement[];

    capabilities: {
        hasApi: boolean;
        hasAuthentication: boolean;
        hasDatabase: boolean;
    };
};

function normalizePath(path: string): string {
    return path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

function lowerPath(path: string): string {
    return normalizePath(path).toLowerCase();
}

function detectRoutePathFromFile(filePath: string): string | null {
    const normalized = normalizePath(filePath);

    if (/^app\/page\.(tsx|ts|jsx|js)$/.test(normalized)) {
        return '/';
    }

    const appPageMatch = normalized.match(/^app\/(.+)\/page\.(tsx|ts|jsx|js)$/);
    if (appPageMatch) {
        const routePart = appPageMatch[1];
        return routePart === 'index' ? '/' : `/${routePart}`.replace(/\/index$/, '');
    }

    const pagesIndexMatch = normalized.match(/^pages\/index\.(tsx|ts|jsx|js)$/);
    if (pagesIndexMatch) {
        return '/';
    }

    const pagesFileMatch = normalized.match(/^pages\/(.+)\.(tsx|ts|jsx|js)$/);
    if (pagesFileMatch) {
        const routePart = pagesFileMatch[1];
        return routePart === 'index' ? '/' : `/${routePart}`;
    }

    if (/^app\/api\/.+\/route\.(ts|js)$/.test(normalized)) {
        return '/api/' + normalized.replace(/^app\/api\//, '').replace(/\/route\.(ts|js)$/, '');
    }

    if (/^pages\/api\/.+\.(ts|js)$/.test(normalized)) {
        return '/api/' + normalized.replace(/^pages\/api\//, '').replace(/\.(ts|js)$/, '');
    }

    return null;
}

function isDirectFileMatch(file: RepositoryFile, pathSuffixes: string[]): boolean {
    const normalized = lowerPath(file.path);
    return pathSuffixes.some((suffix) => normalized === suffix || normalized.endsWith(`/${suffix}`));
}

function detectMethodsFromContent(content: string): string[] {
    const methods = new Set<string>();
    const regex = /export\s+(?:async\s+)?(?:const|function)\s+(GET|POST|PUT|PATCH|DELETE)\b|export\s*\{\s*(?:\w+\s+as\s+)?(GET|POST|PUT|PATCH|DELETE)\s*\}/g;
    const matches = content.matchAll(regex);

    for (const match of matches) {
        const method = match[1] ?? match[2];
        if (method) {
            methods.add(method.toUpperCase());
        }
    }

    return Array.from(methods);
}


function addDetectedSurface(
    map: Map<string, {
        type: TestableSurface['type'];
        methods: Set<string>;
        sourceFiles: Set<string>;
        evidence: Set<string>;
    }>,
    path: string,
    type: TestableSurface['type'],
    filePath: string,
    evidence: string,
    methods: string[] = []
): void {
    if (!path || !path.startsWith('/')) {
        return;
    }

    const entry = map.get(path) ?? {
        type,
        methods: new Set<string>(),
        sourceFiles: new Set<string>(),
        evidence: new Set<string>(),
    };

    if (entry.type === 'unknown' && type !== 'unknown') {
        entry.type = type;
    }

    for (const method of methods) {
        entry.methods.add(method.toUpperCase());
    }

    entry.sourceFiles.add(filePath);
    entry.evidence.add(evidence);
    map.set(path, entry);
}

function detectGenericTestableSurfaces(
    context: RepositoryContext
): TestableSurface[] {
    const surfaces = new Map<string, {
        type: TestableSurface['type'];
        methods: Set<string>;
        sourceFiles: Set<string>;
        evidence: Set<string>;
    }>();

    const fileByPath = new Map(
        context.files.map((file) => [normalizePath(file.path), file])
    );

    // FastAPI commonly mounts routers like:
    // app.include_router(stations.router, prefix="/stations")
    // app.include_router(router, prefix="/api")
    // Capture those prefixes so @router.get("/overview") becomes
    // /stations/overview rather than incorrectly becoming /overview.
    const routerPrefixes = new Map<string, string>();

    for (const file of context.files) {
        const content = file.content;

        const includeRouterRegex =
            /\binclude_router\s*\(\s*([A-Za-z_][\w.]*)\s*(?:,[^)]*?)?\bprefix\s*=\s*["'`]([^"'`]+)["'`]/g;

        for (const match of content.matchAll(includeRouterRegex)) {
            const routerName = match[1];
            const prefix = match[2];

            routerPrefixes.set(
                routerName.split('.').pop() ?? routerName,
                prefix
            );
        }
    }

    function normalizeRoutePath(path: string): string {
        if (!path) return '/';

        const normalized = path
            .replace(/\/+/g, '/')
            .replace(/\/$/, '');

        return normalized || '/';
    }

    function getPythonRouterPrefix(filePath: string): string {
        const file = fileByPath.get(normalizePath(filePath));

        if (!file) return '';

        const moduleName =
            normalizePath(filePath)
                .split('/')
                .pop()
                ?.replace(/\.py$/, '') ?? '';

        // Prefer an explicitly imported router name when present.
        const routerDeclaration =
            file.content.match(
                /\b([A-Za-z_]\w*)\s*=\s*(?:APIRouter|Blueprint)\s*\(/
            )?.[1];

        if (routerDeclaration && routerPrefixes.has(routerDeclaration)) {
            return routerPrefixes.get(routerDeclaration) ?? '';
        }

        if (routerPrefixes.has(moduleName)) {
            return routerPrefixes.get(moduleName) ?? '';
        }

        return '';
    }

    function resolvePythonRoute(
        filePath: string,
        routePath: string
    ): string {
        const prefix = getPythonRouterPrefix(filePath);

        if (!prefix) {
            return normalizeRoutePath(routePath);
        }

        return normalizeRoutePath(
            `${prefix}/${routePath}`
        );
    }

    // React Router declarations.
    const reactRouteRegex =
        /(?:<Route\b[^>]*\bpath\s*=\s*["'`]([^"'`]+)["'`]|(?:path)\s*:\s*["'`]([^"'`]+)["'`])/g;

    // Express / Node style HTTP routes.
    const httpRouteRegex =
        /\b(?:app|router|server)\s*\.\s*(get|post|put|patch|delete|options|head)\s*\(\s*["'`]([^"'`]+)["'`]/gi;

    // FastAPI / Flask decorator routes.
    const decoratorRouteRegex =
        /@(?:app|router)\s*\.\s*(get|post|put|patch|delete|options|head|route)\s*\(\s*["'`]([^"'`]+)["'`]/gi;

    // Spring mappings.
    const springRouteRegex =
        /@(GetMapping|PostMapping|PutMapping|PatchMapping|DeleteMapping|RequestMapping)\s*(?:\(\s*)?(?:value\s*=\s*)?["'`]([^"'`]+)["'`]/gi;

    for (const file of context.files) {
        const content = file.content;
        const normalizedFilePath = normalizePath(file.path);
        const isPython = normalizedFilePath.endsWith('.py');

        for (const match of content.matchAll(reactRouteRegex)) {
            const path = match[1] ?? match[2];

            if (!path || !path.startsWith('/')) {
                continue;
            }

            addDetectedSurface(
                surfaces,
                normalizeRoutePath(path),
                'page',
                file.path,
                'React Router route declaration'
            );
        }

        for (const match of content.matchAll(httpRouteRegex)) {
            const method = match[1].toUpperCase();
            let path = match[2];

            if (isPython) {
                path = resolvePythonRoute(file.path, path);
            }

            addDetectedSurface(
                surfaces,
                normalizeRoutePath(path),
                'api',
                file.path,
                `${method} HTTP route declaration`,
                [method]
            );
        }

        for (const match of content.matchAll(decoratorRouteRegex)) {
            const decorator = match[1].toUpperCase();
            let path = match[2];

            if (isPython) {
                path = resolvePythonRoute(file.path, path);
            }

            const methods =
                decorator === 'ROUTE'
                    ? []
                    : [decorator];

            addDetectedSurface(
                surfaces,
                normalizeRoutePath(path),
                'api',
                file.path,
                `${match[1]} route declaration`,
                methods
            );
        }

        for (const match of content.matchAll(springRouteRegex)) {
            const mapping = match[1].toUpperCase();
            const path = match[2];

            const methodMap: Record<string, string[]> = {
                GETMAPPING: ['GET'],
                POSTMAPPING: ['POST'],
                PUTMAPPING: ['PUT'],
                PATCHMAPPING: ['PATCH'],
                DELETEMAPPING: ['DELETE'],
                REQUESTMAPPING: [],
            };

            addDetectedSurface(
                surfaces,
                normalizeRoutePath(path),
                'api',
                file.path,
                `${match[1]} route declaration`,
                methodMap[mapping] ?? []
            );
        }
    }

    return Array.from(surfaces.entries())
        .map(([path, entry]) => ({
            path,
            sourceFiles: Array.from(entry.sourceFiles).sort(),
            type: entry.type,
            methods: Array.from(entry.methods).sort(),
            evidence: Array.from(entry.evidence).sort(),
        }))
        .sort((a, b) => a.path.localeCompare(b.path));
}

function getFileSet(context: RepositoryContext): Set<string> {
    return new Set(context.files.map((file) => lowerPath(file.path)));
}

function findAuthEvidence(context: RepositoryContext): string[] {
    const evidence = new Set<string>();
    const fileSet = getFileSet(context);

    for (const file of context.files) {
        const p = lowerPath(file.path);
        const content = file.content.toLowerCase();

        const pathMatches = [
            'sign-in',
            'sign-up',
            'login',
            'logout',
            'auth',
            'oauth',
            'callback',
            'session',
            'signin',
            'signup',
        ];

        const isPathEvidence = pathMatches.some((token) => p.includes(token));
        const hasAuthCode = /currentuser|signin|signout|oauth|callback|session|auth\b/.test(content);

        if (isPathEvidence || hasAuthCode) {
            evidence.add(file.path);
        }
    }

    if (fileSet.has('app/sign-in') || fileSet.has('app/sign-up')) {
        evidence.add('app/sign-in');
        evidence.add('app/sign-up');
    }

    return Array.from(evidence);
}

function findInteractionEvidence(context: RepositoryContext): InteractionSurface[] {
    const interactions: InteractionSurface[] = [];
    const groups = new Map<string, { evidence: Set<string>; files: Set<string> }>();

    for (const file of context.files) {
        const content = file.content;
        const normalizedPath = lowerPath(file.path);
        const fileEvidence = new Set<string>();
        const files = new Set<string>();

        if (/<form|onsubmit|handlesubmit|submit\s*\(/i.test(content)) {
            fileEvidence.add('form submission');
            files.add(file.path);
        }

        if (/checkout|disconnect|connect|sync|submit|signup|signin|login|logout/i.test(content) || /checkout|disconnect|connect|sync/i.test(normalizedPath)) {
            fileEvidence.add('workflow trigger');
            files.add(file.path);
        }

        if (/button|onClick|onClick=|handle.*click/i.test(content)) {
            fileEvidence.add('button interaction');
            files.add(file.path);
        }

        if (fileEvidence.size > 0) {
            const name = fileEvidence.has('form submission') ? 'form submission' : 'workflow interaction';
            const entry = groups.get(name) ?? { evidence: new Set<string>(), files: new Set<string>() };
            for (const evidence of fileEvidence) {
                entry.evidence.add(evidence);
            }
            for (const f of files) {
                entry.files.add(f);
            }
            groups.set(name, entry);
        }
    }

    for (const [name, entry] of groups.entries()) {
        interactions.push({
            name,
            evidence: Array.from(entry.evidence),
            sourceFiles: Array.from(entry.files),
        });
    }

    return interactions;
}

function detectDatabaseEvidence(context: RepositoryContext): boolean {
    const lowered = context.files.map((file) => lowerPath(file.path));
    const dbIndicators = ['db/', 'schema.ts', 'schema.js', 'prisma', 'drizzle', 'sequelize', 'mongoose', 'typeorm'];

    for (const file of context.files) {
        const p = lowerPath(file.path);
        const content = file.content.toLowerCase();

        if (dbIndicators.some((indicator) => p.includes(indicator) || content.includes(indicator))) {
            return true;
        }
    }

    return lowered.some((path) => path.includes('db/') || path.includes('schema'));
}

function getFileExtension(path: string): string {
    const fileName = path.split('/').pop() ?? '';
    const lastDot = fileName.lastIndexOf('.');
    if (lastDot <= 0 || lastDot === fileName.length - 1) return '';
    return fileName.slice(lastDot).toLowerCase();
}

const TEMPLATE_EXTENSIONS = new Set([
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

function extractDomElementsFromTemplates(context: RepositoryContext): DiscoveredDomElement[] {
    const discovered: DiscoveredDomElement[] = [];
    const seen = new Set<string>();

    const addElement = (el: DiscoveredDomElement) => {
        const key = `${el.selector}|${el.sourceFile}`;
        if (!el.selector || seen.has(key)) return;
        seen.add(key);
        discovered.push(el);
    };

    for (const file of context.files) {
        const ext = getFileExtension(file.path);
        const lower = lowerPath(file.path);
        const isTemplate =
            TEMPLATE_EXTENSIONS.has(ext) ||
            lower.includes('/views/') ||
            lower.includes('/templates/') ||
            lower.includes('/components/') ||
            lower.includes('/pages/');

        if (!isTemplate) continue;

        const content = file.content;

        // 1. Form elements and actions
        const formRegex = /<form\b([^>]*)>/gi;
        for (const match of content.matchAll(formRegex)) {
            const attrs = match[1];
            const actionMatch = attrs.match(/\baction=["']([^"']*)["']/i);
            const methodMatch = attrs.match(/\bmethod=["']([^"']*)["']/i);
            const idMatch = attrs.match(/\bid=["']([^"']*)["']/i);
            const classMatch = attrs.match(/\b(?:class|className)=["']([^"']*)["']/i);

            const action = actionMatch ? actionMatch[1] : undefined;
            const id = idMatch ? idMatch[1] : undefined;
            const classStr = classMatch ? classMatch[1] : undefined;
            const classes = classStr ? classStr.trim().split(/\s+/).filter(Boolean) : undefined;

            let selector = 'form';
            if (id) {
                selector = `#${id}`;
            } else if (action) {
                selector = `form[action="${action}"]`;
            } else if (classes && classes.length > 0) {
                selector = `form.${classes[0]}`;
            }

            addElement({
                selector,
                tag: 'form',
                id,
                classes,
                action,
                type: methodMatch ? methodMatch[1].toUpperCase() : 'POST',
                sourceFile: file.path,
                description: action ? `Form submitting to ${action}` : 'Form container',
            });
        }

        // 2. Input elements (name, type, id, class)
        const inputRegex = /<input\b([^>]*)>/gi;
        for (const match of content.matchAll(inputRegex)) {
            const attrs = match[1];
            const nameMatch = attrs.match(/\bname=["']([^"']*)["']/i);
            const typeMatch = attrs.match(/\btype=["']([^"']*)["']/i);
            const idMatch = attrs.match(/\bid=["']([^"']*)["']/i);
            const classMatch = attrs.match(/\b(?:class|className)=["']([^"']*)["']/i);

            const name = nameMatch ? nameMatch[1] : undefined;
            const type = typeMatch ? typeMatch[1] : 'text';
            const id = idMatch ? idMatch[1] : undefined;
            const classStr = classMatch ? classMatch[1] : undefined;
            const classes = classStr ? classStr.trim().split(/\s+/).filter(Boolean) : undefined;

            let selector = 'input';
            if (id) {
                selector = `#${id}`;
            } else if (name) {
                selector = `input[name="${name}"]`;
            } else if (classes && classes.length > 0) {
                selector = `input.${classes[0]}`;
            } else if (type) {
                selector = `input[type="${type}"]`;
            }

            addElement({
                selector,
                tag: 'input',
                name,
                type,
                id,
                classes,
                sourceFile: file.path,
                description: name ? `Input field [name="${name}"]` : `Input [type="${type}"]`,
            });
        }

        // 3. Button elements
        const buttonRegex = /<button\b([^>]*)>(?:([\s\S]*?)<\/button>)?/gi;
        for (const match of content.matchAll(buttonRegex)) {
            const attrs = match[1];
            const textContent = match[2]?.trim().replace(/\s+/g, ' ');
            const typeMatch = attrs.match(/\btype=["']([^"']*)["']/i);
            const nameMatch = attrs.match(/\bname=["']([^"']*)["']/i);
            const idMatch = attrs.match(/\bid=["']([^"']*)["']/i);
            const classMatch = attrs.match(/\b(?:class|className)=["']([^"']*)["']/i);

            const type = typeMatch ? typeMatch[1] : 'submit';
            const name = nameMatch ? nameMatch[1] : undefined;
            const id = idMatch ? idMatch[1] : undefined;
            const classStr = classMatch ? classMatch[1] : undefined;
            const classes = classStr ? classStr.trim().split(/\s+/).filter(Boolean) : undefined;

            let selector = 'button';
            if (id) {
                selector = `#${id}`;
            } else if (name) {
                selector = `button[name="${name}"]`;
            } else if (type === 'submit') {
                selector = 'button[type="submit"]';
            } else if (classes && classes.length > 0) {
                selector = `button.${classes[0]}`;
            }

            addElement({
                selector,
                tag: 'button',
                name,
                type,
                id,
                classes,
                sourceFile: file.path,
                description: textContent ? `Button "${textContent.slice(0, 30)}"` : 'Button element',
            });
        }

        // 4. Containers and semantic elements with IDs or notable classes
        const containerRegex = /<(div|main|section|ul|ol|li|h1|h2|h3|p)\b([^>]*)>/gi;
        for (const match of content.matchAll(containerRegex)) {
            const tag = match[1].toLowerCase();
            const attrs = match[2];
            const idMatch = attrs.match(/\bid=["']([^"']*)["']/i);
            const classMatch = attrs.match(/\b(?:class|className)=["']([^"']*)["']/i);

            if (idMatch) {
                const id = idMatch[1];
                addElement({
                    selector: `#${id}`,
                    tag,
                    id,
                    sourceFile: file.path,
                    description: `${tag} container #${id}`,
                });
            }

            if (classMatch) {
                const classStr = classMatch[1];
                const classes = classStr.trim().split(/\s+/).filter(Boolean);
                for (const cls of classes.slice(0, 3)) {
                    if (cls.length >= 2 && !cls.includes('{') && !cls.includes('%')) {
                        addElement({
                            selector: `.${cls}`,
                            tag,
                            classes: [cls],
                            sourceFile: file.path,
                            description: `${tag} element with class .${cls}`,
                        });
                    }
                }
            }
        }
    }

    return discovered.slice(0, 60);
}

function detectImportantFiles(context: RepositoryContext): string[] {
    const important = new Set<string>();
    const allFiles = context.files.map((file) => file.path);

    for (const file of allFiles) {
        const lp = lowerPath(file);
        if (
            lp.includes('/api/') ||
            lp.endsWith('/page.tsx') ||
            lp.endsWith('/page.ts') ||
            lp.endsWith('/page.jsx') ||
            lp.endsWith('/page.js') ||
            lp.endsWith('.ejs') ||
            lp.endsWith('.html') ||
            lp.endsWith('.htm') ||
            lp.endsWith('.vue') ||
            lp.endsWith('.svelte') ||
            lp.endsWith('.hbs') ||
            lp.endsWith('.pug') ||
            lp.includes('/views/') ||
            lp.includes('/templates/') ||
            lp.includes('/components/') ||
            lp.includes('sign-in') ||
            lp.includes('sign-up') ||
            lp.includes('auth') ||
            lp.includes('workspace') ||
            lp.includes('checkout') ||
            lp.includes('connect') ||
            lp.includes('sync') ||
            lp.includes('disconnect') ||
            lp.endsWith('package.json') ||
            lp.endsWith('db/schema.ts') ||
            lp.endsWith('db/schema.js')
        ) {
            important.add(file);
        }
    }

    return Array.from(important).slice(0, 50);
}

function validateRepositoryAnalysis(context: RepositoryContext, analysis: RepositoryAnalysis): void {
    const allowedFileSet = new Set(context.files.map((file) => file.path));

    if (!analysis || typeof analysis !== 'object') {
        throw new Error('Repository analysis must be an object');
    }

    if (!Array.isArray(analysis.routes)) {
        throw new Error('routes must be an array');
    }

    if (!Array.isArray(analysis.apiEndpoints)) {
        throw new Error('apiEndpoints must be an array');
    }

    if (!Array.isArray(analysis.testableSurfaces)) {
        throw new Error('testableSurfaces must be an array');
    }

    if (!analysis.authentication || typeof analysis.authentication !== 'object') {
        throw new Error('authentication must be an object');
    }

    if (!Array.isArray(analysis.interactions)) {
        throw new Error('interactions must be an array');
    }

    for (const route of analysis.routes) {
        if (typeof route.path !== 'string' || !route.path) {
            throw new Error('Route path is required');
        }
        if (!Array.isArray(route.sourceFiles)) {
            throw new Error('Route sourceFiles must be an array');
        }
        for (const file of route.sourceFiles) {
            if (!allowedFileSet.has(file)) {
                throw new Error(`Route source file not found in repository context: ${file}`);
            }
        }
    }

    for (const endpoint of analysis.apiEndpoints) {
        if (typeof endpoint.route !== 'string' || !endpoint.route.startsWith('/')) {
            throw new Error('API route is required and must start with /');
        }
        if (!Array.isArray(endpoint.methods)) {
            throw new Error('API methods must be an array');
        }
        if (!Array.isArray(endpoint.sourceFiles)) {
            throw new Error('API sourceFiles must be an array');
        }
        for (const file of endpoint.sourceFiles) {
            if (!allowedFileSet.has(file)) {
                throw new Error(`API source file not found in repository context: ${file}`);
            }
        }
    }

    for (const surface of analysis.testableSurfaces) {
        if (typeof surface.path !== 'string' || !surface.path.startsWith('/')) {
            throw new Error('Testable surface path is required and must start with /');
        }

        if (!Array.isArray(surface.sourceFiles)) {
            throw new Error('Testable surface sourceFiles must be an array');
        }

        if (!Array.isArray(surface.methods) || !Array.isArray(surface.evidence)) {
            throw new Error('Testable surface methods and evidence must be arrays');
        }

        for (const file of surface.sourceFiles) {
            if (!allowedFileSet.has(file)) {
                throw new Error(
                    `Testable surface source file not found in repository context: ${file}`
                );
            }
        }
    }

    for (const interaction of analysis.interactions) {
        if (typeof interaction.name !== 'string' || !interaction.name) {
            throw new Error('Interaction name is required');
        }
        if (!Array.isArray(interaction.evidence) || !Array.isArray(interaction.sourceFiles)) {
            throw new Error('Interaction evidence and sourceFiles must be arrays');
        }
        for (const file of interaction.sourceFiles) {
            if (!allowedFileSet.has(file)) {
                throw new Error(`Interaction file not found in repository context: ${file}`);
            }
        }
    }

    for (const file of analysis.importantFiles) {
        if (!allowedFileSet.has(file)) {
            throw new Error(`Important file not found in repository context: ${file}`);
        }
    }

    if (analysis.domElements) {
        if (!Array.isArray(analysis.domElements)) {
            throw new Error('domElements must be an array');
        }
        for (const el of analysis.domElements) {
            if (el.sourceFile && !allowedFileSet.has(el.sourceFile)) {
                throw new Error(`DOM element source file not found in repository context: ${el.sourceFile}`);
            }
        }
    }
}

export function analyzeRepositoryContext(context: RepositoryContext): RepositoryAnalysis {
    const fileSet = getFileSet(context);
    const packageJson = context.files.find((file) => lowerPath(file.path) === 'package.json');
    const packageManager = packageJson
        ? (() => {
            const pkgName = packageJson.content.toLowerCase();
            if (pkgName.includes('"pnpm"') || pkgName.includes('pnpm')) return 'pnpm';
            if (pkgName.includes('"yarn"') || pkgName.includes('yarn')) return 'yarn';
            if (pkgName.includes('"bun"') || pkgName.includes('bun')) return 'bun';
            return 'npm';
        })()
        : context.project.packageManager;

    const testableSurfaces = detectGenericTestableSurfaces(context);
    const domElements = extractDomElementsFromTemplates(context);

    const routes: RouteSurface[] = [];
    const routeFiles = new Map<string, Set<string>>();

    for (const file of context.files) {
        const path = detectRoutePathFromFile(file.path);
        if (!path) {
            continue;
        }

        const entry = routeFiles.get(path) ?? new Set<string>();
        entry.add(file.path);
        routeFiles.set(path, entry);
    }

    // Incorporate surfaces detected from HTTP handlers or page declarations
    for (const surface of testableSurfaces) {
        if (!routeFiles.has(surface.path)) {
            const isApi = surface.path.startsWith('/api') || (surface.type === 'api' && !surface.methods.includes('GET'));
            const type = isApi ? 'api' : 'page';
            const entry = routeFiles.get(surface.path) ?? new Set<string>();
            for (const f of surface.sourceFiles) {
                entry.add(f);
            }
            routeFiles.set(surface.path, entry);
        }
    }

    // Fallback default home route if no routes detected
    if (routeFiles.size === 0) {
        const fallbackFile = context.files.find((f) => /^(app|server|index)\.(js|ts|mjs|cjs)$/i.test(normalizePath(f.path)))?.path ?? context.files[0]?.path;
        if (fallbackFile) {
            routeFiles.set('/', new Set([fallbackFile]));
        }
    }

    for (const [path, sourceFiles] of routeFiles.entries()) {
        const normalizedFiles = Array.from(sourceFiles).sort();
        const type = path.startsWith('/api/') ? 'api' : 'page';
        routes.push({
            path,
            sourceFiles: normalizedFiles,
            type: normalizedFiles.some((file) => file.includes('/api/')) ? 'api' : type,
        });
    }

    const apiEndpoints: ApiSurface[] = [];
    const apiFiles = new Map<string, { methods: Set<string>; files: Set<string> }>();

    for (const file of context.files) {
        const normalizedPath = normalizePath(file.path);
        if (!/^(app|pages)\/api\//.test(normalizedPath)) {
            continue;
        }

        const route = detectRoutePathFromFile(file.path);
        if (!route || !route.startsWith('/api/')) {
            continue;
        }

        const entry = apiFiles.get(route) ?? { methods: new Set<string>(), files: new Set<string>() };
        const methods = detectMethodsFromContent(file.content);
        for (const method of methods) {
            entry.methods.add(method);
        }
        entry.files.add(file.path);
        apiFiles.set(route, entry);
    }

    // Add generic API surfaces (Express, Flask, FastAPI endpoints)
    for (const surface of testableSurfaces) {
        if (surface.type === 'api' || surface.path.startsWith('/api') || surface.methods.some((m) => m !== 'GET')) {
            const entry = apiFiles.get(surface.path) ?? { methods: new Set<string>(), files: new Set<string>() };
            for (const method of surface.methods) {
                entry.methods.add(method);
            }
            for (const f of surface.sourceFiles) {
                entry.files.add(f);
            }
            apiFiles.set(surface.path, entry);
        }
    }

    for (const [route, entry] of apiFiles.entries()) {
        apiEndpoints.push({
            route,
            methods: Array.from(entry.methods).sort(),
            sourceFiles: Array.from(entry.files).sort(),
        });
    }

    const authEvidence = findAuthEvidence(context);
    const authDetected = authEvidence.length > 0;
    const interactions = findInteractionEvidence(context);
    const importantFiles = detectImportantFiles(context);

    const analysis: RepositoryAnalysis = {
        framework: context.project.type || undefined,
        language: context.project.primaryLanguage || undefined,
        packageManager: packageManager || context.project.packageManager || undefined,
        routes: routes.sort((a, b) => a.path.localeCompare(b.path)),
        apiEndpoints: apiEndpoints.sort((a, b) => a.route.localeCompare(b.route)),
        testableSurfaces,
        authentication: {
            detected: authDetected,
            evidence: authEvidence,
        },
        interactions,
        importantFiles,
        domElements,
        capabilities: {
            hasApi:
                apiEndpoints.length > 0 ||
                testableSurfaces.some(
                    (surface) => surface.type === 'api'
                ) ||
                [...fileSet].some((path) => path.includes('/api/')),
            hasAuthentication: authDetected,
            hasDatabase: detectDatabaseEvidence(context),
        },
    };

    validateRepositoryAnalysis(context, analysis);
    return analysis;
}