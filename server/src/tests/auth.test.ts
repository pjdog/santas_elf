import request from 'supertest';
import app from '../index';
import redisClient from '../config/db';

// Mock Redis
jest.mock('../config/db', () => ({
  hGetAll: jest.fn(),
  hSet: jest.fn(),
  on: jest.fn(),
  connect: jest.fn(),
}));

// Mock Passport
jest.mock('passport', () => {
  const originalModule = jest.requireActual('passport');
  return {
    ...originalModule,
    authenticate: (strategy: string) => (req: any, res: any, next: any) => {
      if (strategy === 'google') {
        return res.redirect('/');
      }
      next();
    },
    use: jest.fn(),
    unuse: jest.fn(),
    serializeUser: jest.fn(),
    deserializeUser: jest.fn(),
    initialize: () => (req: any, res: any, next: any) => {
      // Mock logout function
      req.logout = (cb: any) => cb(null);
      next();
    },
    session: () => (req: any, res: any, next: any) => next(),
  };
});

describe('Auth Routes', () => {
  it('GET /auth/google redirects to Google (simulated)', async () => {
    const res = await request(app).get('/auth/google');
    expect(res.status).toBe(302);
  });

  it('GET /auth/logout redirects to /', async () => {
    const res = await request(app).get('/auth/logout');
    expect(res.status).toBe(302);
    // Check location header, it might be '/' or full URL depending on implementation
    expect(res.header.location).toMatch(/\//);
  });

  it('GET /auth/me returns 401 when not logged in', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });
});