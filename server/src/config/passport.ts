import passport from 'passport';
import { Profile, Strategy as GoogleStrategy, VerifyCallback } from 'passport-google-oauth20';
import { Strategy as CustomStrategy } from 'passport-custom';
import redisClient from './db';
import { getConfig } from '../utils/configManager';

/**
 * Interface representing a user stored in Redis/Session.
 */
interface StoredUser {
  id: string;
  displayName: string;
  email: string;
  photo: string;
}

/**
 * Initializes Passport strategies.
 * Specifically sets up the Google OAuth 2.0 strategy using configuration from
 * the config file or environment variables.
 */
export const initializePassport = () => {
    const config = getConfig();
    console.log('Loaded Config:', JSON.stringify(config));
    console.log('Raw Env GOOGLE_CALLBACK_URL:', process.env.GOOGLE_CALLBACK_URL);

    const clientID = config.google?.clientId || process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = config.google?.clientSecret || process.env.GOOGLE_CLIENT_SECRET || '';
    // Prioritize Env for Callback URL to ensure Docker/Nginx routing is respected over stale config
    const callbackURL = process.env.GOOGLE_CALLBACK_URL || config.google?.callbackUrl || '/auth/google/callback';

    console.log('Passport Config - ClientID:', clientID ? 'Set' : 'Not Set');
    console.log('Passport Config - CallbackURL:', callbackURL);

    // Unuse existing strategy if any (to support re-initialization)
    passport.unuse('google');

    if (!clientID || !clientSecret) {
      console.warn('Google OAuth credentials are not configured. Authentication will fail.');
      passport.use('google', new CustomStrategy((req, done) => {
         return done(new Error('Google OAuth credentials are missing. Please configure them in the app settings.'));
      }));
    } else {
      console.log('Initializing Google Strategy with Client ID:', clientID.substring(0, 10) + '...');
      passport.use(
        new GoogleStrategy(
          {
            clientID,
            clientSecret,
            callbackURL,
          },
          async (_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) => {
            console.log('Google Strategy Callback:', profile.id, profile.displayName);
            const user: StoredUser = {
              id: profile.id,
              displayName: profile.displayName,
              email: profile.emails?.[0]?.value ?? '',
              photo: profile.photos?.[0]?.value ?? '',
            };
    
            try {
                await redisClient.hSet(`user:${profile.id}`, { data: JSON.stringify(user) });
                console.log('User saved to Redis:', user.id);
                return done(null, user);
            } catch (err) {
                console.error('Error saving user to Redis:', err);
                return done(err as Error);
            }
          }
        )
      );
    }
};

passport.serializeUser((user, done) => {
  const typedUser = user as StoredUser;
  done(null, typedUser.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const userData = await redisClient.hGetAll(`user:${id}`);
    if (userData && userData.data) {
      const user = JSON.parse(userData.data) as StoredUser;
      done(null, user);
      return;
    }
    // User not found (session might be stale or redis cleared). 
    // Return null, null to indicate "no user" but "no system error", so it's treated as unauthenticated (401).
    done(null, null);
  } catch (error) {
    console.error('Error deserializing user:', error);
    done(error as Error);
  }
});

export default passport;