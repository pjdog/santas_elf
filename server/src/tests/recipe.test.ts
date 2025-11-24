import express from 'express';
import request from 'supertest';
import recipeRoutes from '../routes/recipes';
import { tools } from '../tools';

// Mock the tools module
jest.mock('../tools', () => ({
  tools: {
    find_recipe: {
      function: jest.fn(),
    },
  },
}));

const app = express();
app.use(express.json());
app.use('/api/recipes', recipeRoutes);

describe('Recipe API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns recipes from LLM tool', async () => {
    const mockRecipe = {
      name: 'Mock Recipe',
      description: 'A mock description',
      ingredients: [{ item: 'Mock Ingredient', quantity: 1, unit: 'cup' }],
      instructions: ['Step 1'],
      servings: 4,
      prepTime: '10 min',
      cookTime: '10 min',
      dietary: [],
    };

    (tools.find_recipe.function as jest.Mock).mockResolvedValue(mockRecipe);

    const res = await request(app).get('/api/recipes?q=test');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toEqual('Mock Recipe');
    expect(res.body[0].id).toMatch(/^llm-/);
  });

  test('handles null result from LLM tool gracefully', async () => {
    (tools.find_recipe.function as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get('/api/recipes?q=unknown');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual([]);
  });

  test('scales ingredients based on guest number', async () => {
    const mockRecipe = {
        name: 'Mock Recipe',
        ingredients: [{ item: 'Flour', quantity: 100, unit: 'g' }],
        servings: 4,
        instructions: [],
        prepTime: '',
        cookTime: '',
        dietary: []
    };
    (tools.find_recipe.function as jest.Mock).mockResolvedValue(mockRecipe);

    const res = await request(app).get('/api/recipes?guests=8');
    expect(res.statusCode).toEqual(200);
    expect(res.body[0].ingredients[0].quantity).toBe(200);
  });

  test('defaults to "Christmas dinner" query if q is missing', async () => {
    const mockRecipe = {
        name: 'Christmas Dinner',
        ingredients: [],
        servings: 4,
    };
    (tools.find_recipe.function as jest.Mock).mockResolvedValue(mockRecipe);

    await request(app).get('/api/recipes');
    expect(tools.find_recipe.function).toHaveBeenCalledWith('Christmas dinner');
  });
});