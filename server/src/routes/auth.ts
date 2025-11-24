import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';

const router = Router();

router.get('/google', (req, res, next) => {
    console.log('Starting Google Auth...');
    next();
}, passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', (req, res, next) => {
  console.log('Google Auth Callback received. Query:', req.query);
  
  // Dynamic success/fail redirect
  // If in production/single-port, we redirect to '/'
  // If in dev (ports 3000 vs 5000), we might need to redirect to client port.
  // But if we use relative paths in frontend, we can stick to '/' if we are serving client.
  
  // Heuristic: If headers origin is 3000, use that? No, callback comes from Google.
  // Let's use env var or default to relative '/'.
  const SUCCESS_URL = process.env.CLIENT_URL || '/';
  
  passport.authenticate('google', (err: any, user: any, info: any) => {
    if (err) {
      console.error('Passport Auth Error:', err);
      return res.redirect(`${SUCCESS_URL}?error=` + encodeURIComponent(err.message || 'AuthError'));
    }
    if (!user) {
      console.error('Passport Auth Failed: No user', info);
      return res.redirect(`${SUCCESS_URL}?error=NoUser`);
    }
    req.logIn(user, (err) => {
      if (err) {
        console.error('Passport Login Error:', err);
        return next(err);
      }
      console.log('Passport Login Success. Session:', req.sessionID);
      return res.redirect(SUCCESS_URL);
    });
  })(req, res, next);
});

router.get('/logout', (req: Request, res: Response, next: NextFunction) => {
  const SUCCESS_URL = process.env.CLIENT_URL || '/';
  console.log('Logging out...');
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      next(err);
      return;
    }
    res.redirect(SUCCESS_URL);
  });
});

router.get('/me', (req: Request, res: Response) => {
  console.log('Checking /me. SessionID:', req.sessionID, 'User:', req.user);
  if (req.user) {
    res.json(req.user);
    return;
  }

  res.status(401).json({ message: 'Not authenticated' });
});

export default router;
