export const OPENROUTER_PROVIDER = 'openrouter' as const;
export const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? 'openai/gpt-oss-20b:free';

export const OPENROUTER_CONFIG = {
    provider: OPENROUTER_PROVIDER,
    model: OPENROUTER_MODEL,
    baseUrl: 'https://openrouter.ai/api/v1',
} as const;

export type OpenRouterMessage = {
    role: 'user' | 'assistant' | 'system';
    content: string;
};

export type OpenRouterCompletionRequest = {
    model?: string;
    messages: OpenRouterMessage[];
    temperature?: number;
    response_format?: {
        type: 'json_object';
    };
};

export function getOpenRouterApiKey(): string {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey || !apiKey.trim()) {
        throw new Error('OPENROUTER_API_KEY is not configured');
    }

    return apiKey.trim();
}

export async function callOpenRouter<T = unknown>(request: OpenRouterCompletionRequest): Promise<T> {
    const apiKey = getOpenRouterApiKey();
    const model = request.model ?? OPENROUTER_CONFIG.model;

    const response = await fetch(`${OPENROUTER_CONFIG.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
            'X-Title': 'TestPilot',
        },
        body: JSON.stringify({
            model,
            messages: request.messages,
            temperature: request.temperature ?? 0,
            ...(request.response_format ? { response_format: request.response_format } : {}),
        }),
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`OpenRouter request failed (${response.status}): ${errorText || response.statusText}`);
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
        throw new Error('OpenRouter response did not include content');
    }

    try {
        return JSON.parse(content) as T;
    } catch {
        return content as T;
    }
}

export async function callOpenRouterJson<T = unknown>(
    messages: OpenRouterMessage[],
    options?: {
        model?: string;
        temperature?: number;
    }
): Promise<T> {
    return callOpenRouter<T>({
        model: options?.model ?? OPENROUTER_CONFIG.model,
        messages,
        temperature: options?.temperature ?? 0,
        response_format: { type: 'json_object' },
    });
}
