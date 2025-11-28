import request from 'supertest';
import app from '../index';
import { runAgentExecutor } from '../utils/agentExecutor';
import { getConfig } from '../utils/configManager';

// Mock dependencies
jest.mock('../utils/agentExecutor', () => ({
  runAgentExecutor: jest.fn(),
}));

jest.mock('../middleware/auth', () => ({
  isAuthenticated: (req: any, res: any, next: any) => next(),
}));

jest.mock('../utils/configManager', () => ({
    getConfig: jest.fn(),
    saveConfig: jest.fn()
}));

// Mock GoogleGenerativeAI to prevent actual API calls during test
const mockGenerateContent = jest.fn();
jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
            generateContent: mockGenerateContent
        })
    }))
}));

describe('Seating Plan Feature', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getConfig as jest.Mock).mockReturnValue({
        llm: { apiKey: 'test-key', provider: 'gemini' }
    });
  });

  it('POST /api/agent/chat handles seating plan image upload', async () => {
    // Mock the LLM response for the seating plan
    mockGenerateContent.mockResolvedValue({
        response: {
            text: () => JSON.stringify({
                type: 'seating_plan',
                message: 'Here is your plan',
                data: [
                    { id: "t1", name: "Table 1", seats: 4, guests: ["A", "B", "C", "D"] }
                ]
            })
        }
    });

    const res = await request(app)
      .post('/api/agent/chat')
      .field('purpose', 'seating_plan')
      .attach('image', Buffer.from('fake-image'), 'room.jpg');

    expect(res.status).toBe(200);
    expect(res.body.type).toBe('seating_plan');
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Table 1');
    
    // Verify LLM was called with the specific seating prompt
    expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.arrayContaining([
            expect.stringContaining('Generate a seating plan based on this room layout')
        ])
    );
  });
});
