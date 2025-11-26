import request from 'supertest';
import app from '../index';
import { tools } from '../tools';
import { runAgentExecutor } from '../utils/agentExecutor';
import { Request, Response, NextFunction } from 'express';
import redisClient from '../config/db';
import { generateContent } from '../utils/llm';

// Mock dependencies
jest.mock('../utils/llm', () => ({
  generateContent: jest.fn(),
}));

jest.mock('../utils/agentExecutor', () => ({
  runAgentExecutor: jest.fn(),
}));

jest.mock('../middleware/auth', () => ({
  isAuthenticated: (req: Request, res: Response, next: NextFunction) => next(),
}));

// Mock Redis Client
jest.mock('../config/db', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  lRange: jest.fn(),
  rPush: jest.fn(),
  lTrim: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
}));

// Mock artifact persistence to avoid file writes
jest.mock('../utils/artifactFs', () => ({
  persistArtifactsToDisk: jest.fn(),
}));

const emptyArtifacts = {
  todos: [],
  recipes: [],
  gifts: [],
  decorations: [],
  seating: [],
  budget: { limit: 0 },
  agentNotes: [],
  features: [],
  preferences: {},
  plan: null
};

describe('Recipe Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(emptyArtifacts));
    (redisClient.set as jest.Mock).mockResolvedValue('OK');
  });

  it('add_recipe_to_artifacts tool adds a recipe to artifacts', async () => {
    const recipeData = { name: "Test Recipe", description: "Desc", ingredients: [], instructions: [] };
    
    // Call the REAL tool
    const result = await tools['add_recipe_to_artifacts'].function(JSON.stringify(recipeData), { userId: 'test-user', scenario: 'test' });

    expect(result.success).toBe(true);
    expect(result.message).toContain("Recipe 'Test Recipe' added");
    
    // Verify redis set was called with new recipe
    const updatedArtifactsJson = (redisClient.set as jest.Mock).mock.calls[0][1];
    const updatedArtifacts = JSON.parse(updatedArtifactsJson);
    expect(updatedArtifacts.recipes).toHaveLength(1);
    expect(updatedArtifacts.recipes[0].name).toBe("Test Recipe");
  });

  it('agent executor uses find_recipe and then add_recipe_to_artifacts', async () => {
    const mockRecipe = { name: "Found Cookies", description: "Delicious", ingredients: [], instructions: [] };
    const artifactsWithRecipe = { ...emptyArtifacts, recipes: [mockRecipe] };

    // Mock generateContent for find_recipe
    (generateContent as jest.Mock).mockResolvedValue(JSON.stringify(mockRecipe));

    // Mock the runAgentExecutor to simulate the agent's decision process
    (runAgentExecutor as jest.Mock).mockImplementation(async (userId, scenario, prompt, contextInfo) => {
        // We simulate the output directly without needing to run the real tools inside the mock
        // This ensures the test focuses on the API response handling of the executor's result
        
        const addRecipeOutput = { success: true, message: "Recipe added.", artifacts: artifactsWithRecipe };
        
        return {
            finalAnswer: `I found a recipe for "${mockRecipe.name}" and added it to your planner.`,
            steps: [
                `Action: find_recipe("cookies")`,
                `Observation: ...`,
                `Action: add_recipe_to_artifacts(...)`
            ],
            artifactsUpdated: true,
            updatedArtifacts: artifactsWithRecipe,
            lastToolUsed: 'add_recipe_to_artifacts',
            lastToolResult: addRecipeOutput
        };
    });

    // Make the request to the agent route
    const res = await request(app)
      .post('/api/agent/chat')
      .send({ prompt: "Find me a cookie recipe and save it." });

    expect(res.status).toBe(200);
    expect(res.body.type).toBe('recipe');
    expect(res.body.message).toContain("I found a recipe for \"Found Cookies\" and added it to your planner.");
    expect(res.body.data.artifacts.recipes[0].name).toBe("Found Cookies");
    expect(res.body.artifactsUpdated).toBe(true);
  });
});
