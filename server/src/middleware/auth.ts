import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check if the user is authenticated.
 * Returns 401 Unauthorized if the user is not logged in.
 * 
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware function.
 */
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  const cliSecret = process.env.CLI_SECRET;
  if (cliSecret && req.headers['x-cli-secret'] === cliSecret) {
    // Light-weight bypass for local CLI tooling; do not use in production without a strong secret.
    return next();
  }

  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'User not authenticated' });
};
