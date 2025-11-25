import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { getConfig } from '../utils/configManager';

/**
 * Middleware to check if the user is authenticated.
 * Returns 401 Unauthorized if the user is not logged in.
 * 
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware function.
 */
export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  const cliSecret = process.env.CLI_SECRET;
  if (cliSecret && req.headers['x-cli-secret'] === cliSecret) {
    // Light-weight bypass for local CLI tooling; do not use in production without a strong secret.
    return next();
  }

  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  // Support Google ID token auth for CLI/automation use cases
  const bearer = (req.headers.authorization || '').replace(/bearer /i, '').trim();
  const googleIdToken = bearer || (req.headers['x-google-id-token'] as string);
  if (googleIdToken) {
    try {
        const config = getConfig();
        const clientId = config.google?.clientId || process.env.GOOGLE_CLIENT_ID;
        if (!clientId) {
            return res.status(401).json({ message: 'Google OAuth not configured' });
        }

        const { data } = await axios.get('https://oauth2.googleapis.com/tokeninfo', { params: { id_token: googleIdToken } });
        const aud = data?.aud;
        const exp = Number(data?.exp) * 1000;
        
        if (aud !== clientId) {
            return res.status(401).json({ message: 'Invalid token audience' });
        }
        if (Number.isFinite(exp) && Date.now() > exp) {
            return res.status(401).json({ message: 'Token expired' });
        }

        // @ts-ignore attach user for downstream handlers
        req.user = {
            id: data?.sub,
            displayName: data?.name || data?.email || data?.sub,
            email: data?.email,
            photo: data?.picture
        };
        return next();
    } catch (err) {
        console.error('Google ID token validation failed', err);
    }
  }

  res.status(401).json({ message: 'User not authenticated' });
};
