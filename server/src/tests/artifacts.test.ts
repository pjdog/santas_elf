import request from 'supertest';
import express from 'express';
import artifactsRouter from '../routes/artifacts';
import redisClient from '../config/db';

// Mock Redis
jest.mock('../config/db', () => ({
  get: jest.fn(),
  set: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
}));

const app = express();
app.use(express.json());
// Mock auth middleware injection
app.use((req, res, next) => {
    // @ts-ignore
    req.user = { id: 'test-user' };
    next();
});
app.use('/api/artifacts', artifactsRouter);

describe('Artifact Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/artifacts returns initial state if empty', async () => {
    (redisClient.get as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get('/api/artifacts');
    
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
        todos: [],
        recipes: [],
        gifts: [],
        decorations: [],
        seating: [],
        budget: { limit: 0 },
        agentNotes: []
    });
  });

  it('GET /api/artifacts returns stored data', async () => {
    const mockData = {
        todos: [{ id: '1', text: 'Buy milk', completed: false }],
        recipes: [],
        gifts: [],
        decorations: [],
        seating: [],
        budget: { limit: 100 }
    };
    (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(mockData));

    const res = await request(app).get('/api/artifacts');
    
    expect(res.status).toBe(200);
    expect(res.body.todos[0].text).toBe('Buy milk');
  });

  it('POST /api/artifacts saves valid data', async () => {
    const newData = {
        todos: [{ id: '1', text: 'New Task', completed: true }],
        recipes: [],
        gifts: [],
        decorations: [],
        seating: [],
        budget: { limit: 500 },
        agentNotes: []
    };

    const res = await request(app)
        .post('/api/artifacts')
        .send(newData);

    expect(res.status).toBe(200);
    expect(redisClient.set).toHaveBeenCalledWith(
        'santas_elf:artifacts:test-user:default', 
        JSON.stringify(newData)
    );
  });

  it('POST /api/artifacts sanitizes input', async () => {
    const maliciousData = {
        todos: [{ id: '1', text: '<script>alert(1)</script>', completed: false }]
    };

    const res = await request(app)
        .post('/api/artifacts')
        .send(maliciousData);

    expect(res.status).toBe(200);
    // Check response or mock call for sanitized value
    expect(res.body.todos[0].text).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('POST /api/artifacts rejects invalid structure', async () => {
    const res = await request(app)
        .post('/api/artifacts')
        .send("Not JSON");

    expect(res.status).toBe(400);
  });
});
