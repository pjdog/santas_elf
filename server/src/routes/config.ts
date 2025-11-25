import { Router, Request, Response } from 'express';
import { getConfig, saveConfig } from '../utils/configManager';
import { initializePassport } from '../config/passport';

const router = Router();

router.get('/auth', (req: Request, res: Response) => {
    const config = getConfig();
    const hasEnv = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    const hasConfig = !!(config.google?.clientId && config.google?.clientSecret);
    
    res.json({
        configured: hasConfig || hasEnv,
        usingEnv: !hasConfig && hasEnv,
        // Masked ID for display
        clientId: config.google?.clientId 
            ? `${config.google.clientId.substring(0, 10)}...` 
            : (hasEnv ? 'Set via ENV' : null),
        callbackUrl: config.google?.callbackUrl || process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback'
    });
});

router.post('/auth', (req: Request, res: Response) => {
    const { clientId, clientSecret, callbackUrl } = req.body;

    if (!clientId || !clientSecret) {
        res.status(400).json({ message: 'Client ID and Secret are required.' });
        return;
    }

    try {
        saveConfig({
            google: {
                clientId,
                clientSecret,
                callbackUrl: callbackUrl || '/auth/google/callback'
            }
        });

        // Re-initialize passport with new settings
        initializePassport();

        res.json({ message: 'Authentication settings saved and applied successfully.' });
    } catch (error) {
        console.error('Error saving auth config:', error);
        res.status(500).json({ message: 'Failed to save configuration.' });
    }
});

router.get('/llm', (req: Request, res: Response) => {
    const config = getConfig();
    res.json({
        provider: config.llm?.provider || 'gemini',
        // Mask key
        apiKey: config.llm?.apiKey ? '********' : '', 
        model: config.llm?.model || '',
        baseUrl: config.llm?.baseUrl || ''
    });
});

router.post('/llm', (req: Request, res: Response) => {
    const { provider, apiKey, model, baseUrl } = req.body;

    try {
        const current = getConfig();
        
        // Safety check: If current config is valid but we are about to save an empty key 
        // when the user might have intended to keep it (though frontend logic handles this, backend should be safe too)
        // Actually, the frontend logic sends empty string if it wants to clear? No, frontend sends '********' to keep.
        // But if config file read failed earlier, 'current' might be empty.
        
        const currentKey = current.llm?.apiKey || '';
        const newKey = apiKey === '********' || (!apiKey && currentKey) ? currentKey : apiKey;
        
        saveConfig({
            llm: {
                provider: provider || 'gemini',
                apiKey: newKey,
                model: model || '',
                baseUrl: baseUrl || ''
            }
        });
        res.json({ message: 'LLM settings saved successfully.' });
    } catch (error) {
        console.error('Error saving LLM config:', error);
        res.status(500).json({ message: 'Failed to save configuration.' });
    }
});

export default router;
