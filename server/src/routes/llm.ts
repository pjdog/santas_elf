import { Router, Request, Response } from 'express';
import { getConfig, saveConfig } from '../utils/configManager';
import axios from 'axios';

const router = Router();

router.get('/settings', async (req: Request, res: Response) => {
    try {
        const config = getConfig();
        res.json({
            provider: config.llm?.provider || 'gemini',
            apiKey: config.llm?.apiKey || '',
            model: config.llm?.model || '',
            baseUrl: config.llm?.baseUrl || ''
        });
    } catch (error) {
        console.error('Error fetching LLM settings:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/settings', async (req: Request, res: Response) => {
    const { provider, apiKey, model, baseUrl } = req.body;

    try {
        saveConfig({
            llm: {
                provider: provider || 'gemini',
                apiKey: apiKey || '',
                model: model || '',
                baseUrl: baseUrl || ''
            }
        });
        res.json({ message: 'Settings saved successfully.' });
    } catch (error) {
        console.error('Error saving LLM settings:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/test', async (req: Request, res: Response) => {
    const { provider, apiKey, model, baseUrl } = req.body;

    try {
        if (provider === 'gemini') {
             const { GoogleGenerativeAI } = require('@google/generative-ai');
             const genAI = new GoogleGenerativeAI(apiKey);
             const genModel = genAI.getGenerativeModel({ model: model || 'gemini-1.5-flash' });
             await genModel.generateContent('Hello');
        } 
        else if (provider === 'openai' || provider === 'custom') {
             const url = `${(baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')}/chat/completions`;
             await axios.post(url, {
                model: model || 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: 'Hello' }],
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
        }
        else if (provider === 'anthropic') {
             const url = 'https://api.anthropic.com/v1/messages';
             await axios.post(url, {
                model: model || 'claude-3-opus-20240229',
                max_tokens: 10,
                messages: [{ role: 'user', content: 'Hello' }]
             }, {
                headers: {
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json'
                }
             });
        }

        res.json({ message: 'Connection successful!' });
    } catch (error: any) {
        console.error('Error testing LLM connection:', error);
        // Provide more detail from axios error if available
        const msg = error.response?.data?.error?.message || error.message;
        res.status(400).json({ message: `Connection failed: ${msg}` });
    }
});

export default router;