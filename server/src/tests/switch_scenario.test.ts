import request from 'supertest';
import app from '../index';
import { tools } from '../tools';
import { runAgentExecutor } from '../utils/agentExecutor';

// Mock the executor to simulate tool usage
jest.mock('../utils/agentExecutor', () => ({
  runAgentExecutor: jest.fn(),
}));

jest.mock('../middleware/auth', () => ({
  isAuthenticated: (req: any, res: any, next: any) => next(),
}));

describe('Scenario Switching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tool returns correct structure', async () => {
      const result = await tools['switch_scenario'].function('Birthday Bash');
      expect(result.success).toBe(true);
      expect(result.scenarioName).toBe('birthday-bash');
  });

  it('route handles switch_scenario tool usage', async () => {
    // Mock executor returning a switch action
    (runAgentExecutor as jest.Mock).mockResolvedValue({
      finalAnswer: "Okay, switching to the birthday plan.",
      steps: [],
      artifactsUpdated: false,
      lastToolUsed: 'switch_scenario',
      lastToolResult: { success: true, message: "Switching...", scenarioName: "birthday-bash" }
    });

    const res = await request(app)
      .post('/api/agent/chat')
      .send({ prompt: "Plan a birthday party" });

    expect(res.status).toBe(200);
    expect(res.body.type).toBe('switch_scenario');
    expect(res.body.data).toBe('birthday-bash');
  });
});
