import request from 'supertest';
import app from '../index';
import { generateContent } from '../utils/llm';
import { tools } from '../tools';

// Mock dependencies
jest.mock('../utils/llm', () => ({
  generateContent: jest.fn(),
}));

jest.mock('../middleware/auth', () => ({
  isAuthenticated: (req: any, res: any, next: any) => next(),
}));

// Mock tools
jest.mock('../tools', () => ({
  tools: {
    find_recipe: {
      function: jest.fn(),
      description: 'mock recipe tool'
    },
    find_gift: {
      function: jest.fn(),
      description: 'mock gift tool'
    },
    get_decoration_suggestions: {
      function: jest.fn(),
      description: 'mock decoration tool'
    }
  }
}));

describe('Agent Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/agent/chat handles recipe request', async () => {
    // 1. Mock Classification Response
    (generateContent as jest.Mock).mockResolvedValueOnce(JSON.stringify({
      intent: "recipe",
      toolQuery: "cookies",
      reply: "I can help with cookies!"
    }));

    // 2. Mock Tool Response
    const mockRecipe = { name: "Cookies", description: "Yum", ingredients: [], instructions: [] };
    (tools.find_recipe.function as jest.Mock).mockResolvedValueOnce(mockRecipe);

    const res = await request(app)
      .post('/api/agent/chat')
      .send({ prompt: "I want cookies" });

    expect(res.status).toBe(200);
    expect(res.body.type).toBe('recipe');
    expect(res.body.message).toBe('I can help with cookies!');
    expect(res.body.data).toEqual(mockRecipe);
    
    // Verify classification was called
    expect(generateContent).toHaveBeenCalledTimes(1);
    // Verify tool was called
    expect(tools.find_recipe.function).toHaveBeenCalledWith("cookies");
  });

  it('POST /api/agent/chat handles gift request', async () => {
    (generateContent as jest.Mock).mockResolvedValueOnce(JSON.stringify({
      intent: "gift",
      toolQuery: "Gift for child",
      reply: "Here are some gift ideas"
    }));

    const mockGifts = [{ name: "Toy", description: "Fun" }];
    (tools.find_gift.function as jest.Mock).mockResolvedValueOnce(mockGifts);

    const res = await request(app)
      .post('/api/agent/chat')
      .send({ prompt: "Gift for child" });

    expect(res.status).toBe(200);
    expect(res.body.type).toBe('gift');
    expect(res.body.data).toEqual(mockGifts);
    expect(tools.find_gift.function).toHaveBeenCalledWith("Gift for child");
  });

  it('POST /api/agent/chat handles decoration request', async () => {
    (generateContent as jest.Mock).mockResolvedValueOnce(JSON.stringify({
      intent: "decoration",
      toolQuery: "How to decorate?",
      reply: "Decoration ideas:"
    }));

    const mockDecoration = "Use LED lights";
    (tools.get_decoration_suggestions.function as jest.Mock).mockResolvedValueOnce(mockDecoration);

    const res = await request(app)
      .post('/api/agent/chat')
      .send({ prompt: "How to decorate?" });

    expect(res.status).toBe(200);
    expect(res.body.type).toBe('decoration');
    expect(res.body.data).toBe(mockDecoration);
    expect(tools.get_decoration_suggestions.function).toHaveBeenCalledWith("How to decorate?");
  });

  it('POST /api/agent/chat handles generic chat', async () => {
    // Chat intent doesn't call a tool
    (generateContent as jest.Mock).mockResolvedValueOnce(JSON.stringify({
      intent: "chat",
      reply: "Merry Christmas!",
      toolQuery: ""
    }));

    const res = await request(app)
      .post('/api/agent/chat')
      .send({ prompt: "Hello" });

    expect(res.status).toBe(200);
    expect(res.body.type).toBe('chat');
    expect(res.body.message).toBe('Merry Christmas!');
    expect(res.body.data).toBeNull();
    
    // Ensure no tools were called
    expect(tools.find_recipe.function).not.toHaveBeenCalled();
    expect(tools.find_gift.function).not.toHaveBeenCalled();
  });

  it('POST /api/agent/chat handles scenario switch request', async () => {
    (generateContent as jest.Mock).mockResolvedValueOnce(JSON.stringify({
      intent: "new_scenario",
      toolQuery: "birthday-party",
      reply: "Okay, switching to your birthday party plan."
    }));

    const res = await request(app)
      .post('/api/agent/chat')
      .send({ prompt: "Let's plan a birthday party instead" });

    expect(res.status).toBe(200);
    expect(res.body.type).toBe('switch_scenario');
    expect(res.body.message).toBe('Okay, switching to your birthday party plan.');
    expect(res.body.data).toBe('birthday-party');
  });

  it('POST /api/agent/chat handles LLM failure gracefully', async () => {
    (generateContent as jest.Mock).mockRejectedValueOnce(new Error("LLM Error"));

    const res = await request(app)
      .post('/api/agent/chat')
      .send({ prompt: "Crash me" });

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Failed to process request');
  });
});