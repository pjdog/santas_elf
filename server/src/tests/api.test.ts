import { tools } from '../tools';

// Mock auth middleware
jest.mock('../middleware/auth', () => ({
  isAuthenticated: (req: any, res: any, next: any) => next(),
}));

// Mock tools
jest.mock('../tools', () => ({
  tools: {
    find_recipe: {
      function: jest.fn(),
    },
    find_gift: {
      function: jest.fn(),
    },
  },
}));

// Mock Redis
jest.mock('../config/db', () => {
  const mockStore: Record<string, any> = {};
  return {
    __esModule: true,
    default: {
      hSet: jest.fn(async (key: string, value: Record<string, string>) => {
        if (!mockStore[key]) mockStore[key] = {};
        Object.assign(mockStore[key], value);
        return 1;
      }),
      hGetAll: jest.fn(async (key: string) => {
        return mockStore[key] || {};
      }),
      sAdd: jest.fn(async (key: string, member: string) => {
        if (!mockStore[key]) mockStore[key] = new Set();
        (mockStore[key] as Set<string>).add(member);
        return 1;
      }),
      sMembers: jest.fn(async (key: string) => {
        const val = mockStore[key];
        return val instanceof Set ? Array.from(val) : [];
      }),
      flushAll: jest.fn(async () => {
        for (const key in mockStore) delete mockStore[key];
      }),
      on: jest.fn(),
      connect: jest.fn(),
    },
  };
});

import request from 'supertest';
import app from '../index';
import redisClient from '../config/db';
import { Gift, Recipe } from '../models/types';

beforeAll(async () => {
  const recipes: Recipe[] = [
    {
      id: '1',
      name: 'Classic Sugar Cookies',
      description: 'Perfect for holiday decorating.',
      ingredients: [],
      instructions: [],
      prepTime: '20 min',
      cookTime: '10 min',
      servings: 24,
      dietary: ['vegetarian'],
    },
  ];

  const gifts: Gift[] = [
    {
      id: '1',
      name: 'Cozy Winter Scarf',
      description: 'A warm and stylish scarf, perfect for cold weather.',
      recipient: ['mom', 'friend', 'sister'],
      interests: ['fashion', 'comfort'],
      budget: { min: 20, max: 40 },
      link: 'https://example.com/scarf',
    },
  ];

  await redisClient.flushAll();

  for (const recipe of recipes) {
    await redisClient.hSet(`recipe:${recipe.id}`, { data: JSON.stringify(recipe) });
    await redisClient.sAdd('recipes', `recipe:${recipe.id}`);
  }

  for (const gift of gifts) {
    await redisClient.hSet(`gift:${gift.id}`, { data: JSON.stringify(gift) });
    await redisClient.sAdd('gifts', `gift:${gift.id}`);
  }

  // Setup default mock for recipes
  (tools.find_recipe.function as jest.Mock).mockResolvedValue({
      name: 'Mock Recipe',
      description: 'Desc',
      ingredients: [],
      servings: 4
  });
});

afterAll(async () => {
  await redisClient.flushAll();
});

describe('API Endpoints Integration Tests', () => {
  test('GET /api/recipes returns a list of recipes', async () => {
    const res = await request(app).get('/api/recipes');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('GET /api/recipes?guests=10 returns scaled recipes', async () => {
    const res = await request(app).get('/api/recipes?guests=10');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('GET /api/recipes/:id returns a single recipe', async () => {
    const res = await request(app).get('/api/recipes/1');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('id', '1');
  });

  test('GET /api/gifts returns a list of gifts', async () => {
    const res = await request(app).get('/api/gifts');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('GET /api/gifts?recipient=mom&budgetMax=50 returns filtered gifts', async () => {
    // This test expects to find the seeded gift which has recipient 'mom' and budget max 40 (which is <= 50)
    // However, GET /api/gifts?recipient=mom triggers the LLM tool!
    // So it will NOT return the seeded gift from Redis.
    // We must mock the tool to return a matching gift if we want this to pass, 
    // OR we should update the test to expect LLM result.
    // Given the test name "returns filtered gifts", it probably expects the seeded one if using Redis logic, 
    // but now the logic is changed.
    
    // Let's mock the tool to return a gift that matches the criteria
    const mockGift = {
        name: 'Mock Scarf',
        recipient: ['mom'],
        budget: { min: 20, max: 40 }
    };
    (tools.find_gift.function as jest.Mock).mockResolvedValue([mockGift]);

    const res = await request(app).get('/api/gifts?recipient=mom&budgetMax=50');
    expect(res.statusCode).toEqual(200);
    // The logic in route filters the LLM result by budget.
    // Mock return budget max is 40. Filter is max 50. So it should pass.
    
    expect(res.body.length).toBeGreaterThan(0);
    // The original test checked:
    // expect(res.body.every((gift: Gift) => gift.recipient.includes('mom') && gift.budget.max <= 50)).toBeTruthy();
    // Our mock gift has recipient 'mom'.
    // But the route logic for LLM adds the query param to the gift object?
    // In `gifts.ts`: 
    // recipient: recipientParam ? [recipientParam] : [],
    // So yes, it will have 'mom'.
    
    expect(
      res.body.every(
        (gift: Gift) => gift.recipient.includes('mom') && gift.budget.max <= 50
      )
    ).toBeTruthy();
  });

  test('GET /api/gifts/:id returns a single gift', async () => {
    const res = await request(app).get('/api/gifts/1');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('id', '1');
  });
});