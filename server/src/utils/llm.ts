import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { getConfig } from './configManager';

export const getLLMConfig = async () => {
    const config = getConfig();
    return {
        provider: config.llm?.provider || 'gemini',
        apiKey: config.llm?.apiKey,
        model: config.llm?.model || 'gemini-pro',
        baseUrl: config.llm?.baseUrl
    };
};

export const generateContent = async (prompt: string, systemInstruction?: string): Promise<string> => {
    const config = await getLLMConfig();

    if (!config.apiKey) {
        throw new Error('LLM API Key not configured.');
    }

    if (config.provider === 'gemini') {
        const genAI = new GoogleGenerativeAI(config.apiKey);
        const model = genAI.getGenerativeModel({ model: config.model });
        const fullPrompt = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;
        const result = await model.generateContent(fullPrompt);
        return result.response.text();
    } 
    else if (config.provider === 'openai' || config.provider === 'custom') {
        const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const url = `${cleanBaseUrl}/chat/completions`;
        
        const messages = [];
        if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
        messages.push({ role: 'user', content: prompt });

        const response = await axios.post(url, {
            model: config.model || 'gpt-3.5-turbo',
            messages: messages,
        }, {
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data.choices[0].message.content;
    }
    else if (config.provider === 'anthropic') {
         // Basic Anthropic implementation
         const url = 'https://api.anthropic.com/v1/messages';
         const response = await axios.post(url, {
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
            }
         });
         return response.data.content[0].text;
    }

    throw new Error(`Unsupported provider: ${config.provider}`);
};
