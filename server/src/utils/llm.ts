import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { getConfig } from './configManager';

const DEFAULT_TIMEOUT_MS = 12000;
const RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 400;

/**
 * Wraps a promise with a timeout logic.
 * Rejects if the promise does not resolve within the specified time.
 *
 * @param promise - The promise to wrap.
 * @param timeoutMs - The timeout in milliseconds. Defaults to DEFAULT_TIMEOUT_MS.
 * @returns The result of the promise.
 * @throws Error if the operation times out.
 */
const withTimeout = async <T>(promise: Promise<T>, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> => {
    return await Promise.race([
        promise,
        new Promise<T>((_resolve, reject) =>
            setTimeout(() => reject(new Error('LLM request timed out')), timeoutMs)
        ),
    ]);
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isRetryableError = (error: any) => {
    const status = error?.response?.status;
    if (!status) return true;
    return status >= 500;
};

const wrapLLMError = (provider: string, error: any) => {
    const message = error?.response?.data?.error?.message || error?.message || 'Unknown LLM error';
    return new Error(`LLM (${provider}) failed: ${message}`);
};

const withRetry = async <T>(fn: () => Promise<T>, provider: string): Promise<T> => {
    let lastError: any;
    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (!isRetryableError(error) || attempt === RETRY_ATTEMPTS) {
                throw wrapLLMError(provider, error);
            }
            await sleep(RETRY_DELAY_MS * attempt);
        }
    }
    throw wrapLLMError(provider, lastError);
};

/**
 * Retrieves the LLM configuration from the application settings.
 * Defaults to 'gemini' provider and 'gemini-pro' model if not specified.
 * @returns {Promise<{provider: string, apiKey: string | undefined, model: string, baseUrl: string | undefined}>}
 */
export const getLLMConfig = async () => {
    const config = getConfig();
    return {
        provider: config.llm?.provider || 'gemini',
        apiKey: config.llm?.apiKey,
        model: config.llm?.model || 'gemini-pro',
        baseUrl: config.llm?.baseUrl
    };
};

/**
 * Generates text content using the configured LLM provider.
 * Supports Gemini, OpenAI (and compatible custom endpoints), and Anthropic.
 * 
 * @param {string} prompt - The user's input prompt.
 * @param {string} [systemInstruction] - Optional system instruction to guide the model's behavior.
 * @returns {Promise<string>} The generated text content.
 * @throws {Error} If the API key is missing or the provider is unsupported.
 */
export const generateContent = async (prompt: string, systemInstruction?: string): Promise<string> => {
    const config = await getLLMConfig();

    if (!config.apiKey) {
        throw new Error('LLM API Key not configured.');
    }

    if (config.provider === 'gemini') {
        const genAI = new GoogleGenerativeAI(config.apiKey);
        const model = genAI.getGenerativeModel({ model: config.model });
        // Gemini SDK doesn't strictly separate system prompt in v1 beta consistently across all models via simple calls, 
        // so prepending is a safe compatibility approach for text-only models.
        const fullPrompt = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;
        const result = await withRetry(() => withTimeout(model.generateContent(fullPrompt)), 'gemini');
        return result.response.text();
    } 
    else if (config.provider === 'openai' || config.provider === 'custom') {
        const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const url = `${cleanBaseUrl}/chat/completions`;
        
        const messages: { role: string, content: string }[] = [];
        if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
        messages.push({ role: 'user', content: prompt });

        const response = await withRetry(() => axios.post(url, {
                model: config.model || 'gpt-3.5-turbo',
                messages: messages,
            }, {
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: DEFAULT_TIMEOUT_MS
            }), config.provider);

        return response.data.choices[0].message.content;
    }
    else if (config.provider === 'anthropic') {
         const url = 'https://api.anthropic.com/v1/messages';
         const response = await withRetry(() => axios.post(url, {
                model: config.model || 'claude-3-opus-20240229',
                max_tokens: 1024,
                system: systemInstruction,
                messages: [
                    { role: 'user', content: prompt }
                ]
             }, {
                headers: {
                    'x-api-key': config.apiKey,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json'
                },
                timeout: DEFAULT_TIMEOUT_MS
             }), 'anthropic');
         return response.data.content[0].text;
    }

    throw new Error(`Unsupported provider: ${config.provider}`);
};
