import request from 'supertest';
import app from '../index';
import { runAgentExecutor } from '../utils/agentExecutor';

// Mock the executor instead of the LLM/tools directly for route testing
jest.mock('../utils/agentExecutor', () => ({
  runAgentExecutor: jest.fn(),
}));

jest.mock('../middleware/auth', () => ({
  isAuthenticated: (req: any, res: any, next: any) => next(),
}));

describe('Agent Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/agent/chat handles recipe request via executor', async () => {
    const mockRecipe = { name: "Cookies", description: "Yum" };
    
    (runAgentExecutor as jest.Mock).mockResolvedValue({
      finalAnswer: "I found these cookies!",
      steps: ["Thought: Finding recipe", "Action: find_recipe"],
      artifactsUpdated: false,
      lastToolUsed: 'find_recipe',
      lastToolResult: mockRecipe
    });

    const res = await request(app)
      .post('/api/agent/chat')
      .send({ prompt: "I want cookies" });

    expect(res.status).toBe(200);
    expect(res.body.type).toBe('recipe'); // UI compatibility check
    expect(res.body.message).toContain('I found these cookies!');
    expect(res.body.data).toEqual(mockRecipe);
    expect(runAgentExecutor).toHaveBeenCalled();
  });

  it('POST /api/agent/chat handles gift request via executor', async () => {
    const mockGifts = [{ name: "Toy" }];
    
    (runAgentExecutor as jest.Mock).mockResolvedValue({
      finalAnswer: "Here is a gift idea.",
      steps: [],
      artifactsUpdated: false,
      lastToolUsed: 'find_gift',
      lastToolResult: mockGifts
    });

    const res = await request(app)
      .post('/api/agent/chat')
      .send({ prompt: "Gift for child" });

    expect(res.status).toBe(200);
    expect(res.body.type).toBe('gift');
    expect(res.body.data).toEqual(mockGifts);
  });

  it('POST /api/agent/chat handles chat intent (no tools)', async () => {
    (runAgentExecutor as jest.Mock).mockResolvedValue({
      finalAnswer: "Merry Christmas!",
      steps: ["Thought: Just chatting"],
      artifactsUpdated: false,
      lastToolUsed: undefined
    });

    const res = await request(app)
      .post('/api/agent/chat')
      .send({ prompt: "Hello" });

    expect(res.status).toBe(200);
    expect(res.body.type).toBe('chat');
    expect(res.body.message).toBe("Merry Christmas!");
  });
});
