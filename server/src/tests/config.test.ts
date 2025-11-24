import request from 'supertest';
import app from '../index';
import fs from 'fs';

// Mock configManager to avoid writing to disk during tests
jest.mock('../utils/configManager', () => ({
  getConfig: jest.fn(() => ({
    google: { clientId: 'test', clientSecret: 'test' },
    llm: { provider: 'gemini' }
  })),
  saveConfig: jest.fn(),
}));

describe('Config Routes', () => {
  it('GET /api/config/auth returns config status', async () => {
    const res = await request(app).get('/api/config/auth');
    expect(res.status).toBe(200);
    expect(res.body.configured).toBe(true);
  });

  it('POST /api/config/auth saves config', async () => {
    const res = await request(app)
      .post('/api/config/auth')
      .send({ clientId: 'new', clientSecret: 'new' });
    expect(res.status).toBe(200);
  });

  it('GET /api/config/llm returns llm config', async () => {
    const res = await request(app).get('/api/config/llm');
    expect(res.status).toBe(200);
    expect(res.body.provider).toBe('gemini');
  });
});
