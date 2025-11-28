import { tools } from '../tools';
import redisClient from '../config/db';

// Mock dependencies
jest.mock('../config/db', () => ({
  get: jest.fn(),
  set: jest.fn(),
  sAdd: jest.fn(),
}));

describe('Tool: manage_planner', () => {
  const userId = 'test-user';
  const mockArtifacts = {
      todos: [],
      recipes: [],
      gifts: [],
      decorations: [],
      seating: [],
      budget: { limit: 0 }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (redisClient.get as jest.Mock).mockResolvedValue(JSON.stringify(mockArtifacts));
  });

  it('adds a todo item', async () => {
    const input = JSON.stringify({ action: 'add_todo', data: 'Buy cookies' });
    const result = await tools.manage_planner.function(input, { userId });

    expect(result.success).toBe(true);
    expect(result.message).toContain('Added task: Buy cookies');
    expect(result.artifacts.todos[0].text).toBe('Buy cookies');
    expect(redisClient.set).toHaveBeenCalled();
  });

  it('sets budget', async () => {
    const input = JSON.stringify({ action: 'set_budget', data: 500 });
    const result = await tools.manage_planner.function(input, { userId });

    expect(result.success).toBe(true);
    expect(result.artifacts.budget.limit).toBe(500);
  });

  it('adds a table', async () => {
    const input = JSON.stringify({ action: 'add_table', data: { name: 'Kids Table', seats: 4 } });
    const result = await tools.manage_planner.function(input, { userId });

    expect(result.success).toBe(true);
    expect(result.artifacts.seating[0].name).toBe('Kids Table');
    expect(result.artifacts.seating[0].seats).toBe(4);
  });

  it('handles invalid json gracefully', async () => {
    const result = await tools.manage_planner.function("Invalid JSON", { userId });
    expect(result.success).toBe(false);
    expect(result.message).toContain('Error');
  });
});
