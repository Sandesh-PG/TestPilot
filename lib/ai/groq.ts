export const GROQ_PROVIDER = 'groq' as const;
export const GROQ_MODEL =
    process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';

export const GROQ_CONFIG = {
    provider: GROQ_PROVIDER,
    model: GROQ_MODEL,
    baseUrl: 'https://api.groq.com/openai/v1',
} as const;

export type GroqMessage = {
    role: 'user' | 'assistant' | 'system';
    content: string;
};

export type GroqCompletionRequest = {
    model?: string;
    messages: GroqMessage[];
    temperature?: number;
    maxTokens?: number;
    maxCompletionTokens?: number;
    response_format?: {
        type: 'json_object' | 'text';
    };
};

export function getGroqApiKey(): string {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey || !apiKey.trim()) {
        throw new Error('GROQ_API_KEY is not configured');
    }

    return apiKey.trim();
}

export async function callGroq<T = unknown>(
    request: GroqCompletionRequest
): Promise<T> {
    const apiKey = getGroqApiKey();
    const model = request.model ?? GROQ_CONFIG.model;
    const maxTokens = request.maxTokens ?? request.maxCompletionTokens ?? 4096;

    // Groq rule: If response_format is json_object, at least one message MUST contain "json"
    let messages = [...request.messages];
    if (request.response_format?.type === 'json_object') {
        const hasJsonMention = messages.some((m) =>
            m.content.toLowerCase().includes('json')
        );
        if (!hasJsonMention) {
            messages.unshift({
                role: 'system',
                content:
                    'You are a test automation architect. You must always output responses in valid json format.',
            });
        }
    }

    const payload = {
        model,
        messages,
        temperature: request.temperature ?? 0.2,
        max_tokens: maxTokens,
        ...(request.response_format
            ? {
                  response_format: request.response_format,
              }
            : {}),
    };

    const response = await fetch(
        `${GROQ_CONFIG.baseUrl}/chat/completions`,
        {
            method: 'POST',
            signal: AbortSignal.timeout(45_000),
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        }
    );

    if (!response.ok) {
        const status = response.status;
        const errorText = await response.text().catch(() => '');
        console.error(`[GROQ API ERROR] Status ${status}:`, errorText);

        // If Groq's grammar constraint validator fails with json_validate_failed,
        // retry once without response_format since our system prompt and parser extract JSON reliably
        if (request.response_format && errorText.includes('json_validate_failed')) {
            console.warn('[GROQ API] json_validate_failed received. Retrying without server-side grammar constraint...');
            return callGroq<T>({
                ...request,
                response_format: undefined,
            });
        }

        if (status === 401 || status === 403) {
            throw new Error(`Groq authentication failed (${status}): ${errorText}`);
        }

        if (status === 429) {
            throw new Error(`Groq rate limit exceeded (429): ${errorText}`);
        }

        if (status >= 500) {
            throw new Error(`Groq server error (${status}): ${errorText}`);
        }

        throw new Error(`Groq request failed (${status}): ${errorText}`);
    }

    const data = (await response.json()) as {
        choices?: Array<{
            message?: {
                content?: string;
            };
        }>;
    };

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error(
            'Groq response did not include content'
        );
    }

    const cleaned = content
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

    try {
        return JSON.parse(cleaned) as T;
    } catch {
        const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (match) {
            try {
                return JSON.parse(match[1]) as T;
            } catch {
                // fall through
            }
        }
        throw new Error('Groq returned invalid JSON');
    }
}

export async function callGroqJson<T = unknown>(
    messages: GroqMessage[],
    options?: {
        model?: string;
        temperature?: number;
        maxTokens?: number;
        maxCompletionTokens?: number;
        jsonSchema?: unknown;
    }
): Promise<T> {
    return callGroq<T>({
        model: options?.model ?? GROQ_CONFIG.model,
        messages,
        temperature: options?.temperature ?? 0.2,
        maxTokens: options?.maxTokens ?? options?.maxCompletionTokens ?? 4096,
        response_format: {
            type: 'json_object',
        },
    });
}
