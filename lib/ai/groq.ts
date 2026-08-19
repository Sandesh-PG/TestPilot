export const GROQ_PROVIDER = 'groq' as const;
export const GROQ_MODEL =
    process.env.GROQ_MODEL ?? 'openai/gpt-oss-20b';

export const GROQ_CONFIG = {
    provider: GROQ_PROVIDER,
    model: GROQ_MODEL,
    baseUrl: 'https://api.groq.com/openai/v1',
} as const;

export type GroqMessage = {
    role: 'user' | 'assistant' | 'system';
    content: string;
};

export type GroqJsonSchema = {
    name: string;
    strict?: boolean;
    schema: Record<string, unknown>;
};

export type GroqCompletionRequest = {
    model?: string;
    messages: GroqMessage[];
    temperature?: number;
    maxCompletionTokens?: number;
    response_format?:
        | {
              type: 'json_object';
          }
        | {
              type: 'json_schema';
              json_schema: GroqJsonSchema;
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

    const response = await fetch(
        `${GROQ_CONFIG.baseUrl}/chat/completions`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                messages: request.messages,
                temperature: request.temperature ?? 0,
                ...(request.maxCompletionTokens
                    ? {
                          max_completion_tokens:
                              request.maxCompletionTokens,
                      }
                    : {}),
                ...(request.response_format
                    ? {
                          response_format:
                              request.response_format,
                      }
                    : {}),
            }),
        }
    );

    if (!response.ok) {
        const errorText = await response
            .text()
            .catch(() => '');
        const status = response.status;

        if (status === 401 || status === 403) {
            throw new Error('Groq authentication failed');
        }

        if (status === 429) {
            throw new Error('Groq rate limit exceeded');
        }

        if (status >= 500) {
            throw new Error('Groq server error');
        }

        throw new Error(
            `Groq request failed (${status}): ${
                errorText || response.statusText
            }`
        );
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

    try {
        return JSON.parse(content) as T;
    } catch {
        throw new Error(
            `Groq returned invalid JSON: ${content.slice(
                0,
                1000
            )}`
        );
    }
}

export async function callGroqJson<T = unknown>(
    messages: GroqMessage[],
    options?: {
        model?: string;
        temperature?: number;
        maxCompletionTokens?: number;
        jsonSchema?: GroqJsonSchema;
    }
): Promise<T> {
    return callGroq<T>({
        model: options?.model ?? GROQ_CONFIG.model,
        messages,
        temperature: options?.temperature ?? 0,
        maxCompletionTokens:
            options?.maxCompletionTokens,
        response_format: options?.jsonSchema
            ? {
                  type: 'json_schema',
                  json_schema: options.jsonSchema,
              }
            : {
                  type: 'json_object',
              },
    });
}
