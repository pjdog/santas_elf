import { runAgentExecutor } from '../utils/agentExecutor';
import { generateContent } from '../utils/llm';
import { tools } from '../tools';

// Mock dependencies
jest.mock('../utils/llm', () => ({
  generateContent: jest.fn(),
}));

jest.mock('../tools', () => ({
  tools: {
    find_recipe: {
      description: 'finds a recipe',
      function: jest.fn()
    },
    manage_planner: {
      description: 'manages the planner',
      function: jest.fn()
    }
  },
  toolDefinitions: [
    { name: 'find_recipe', description: 'finds a recipe' },
    { name: 'manage_planner', description: 'manages the planner' }
  ]
}));

describe('Agent Executor (ReAct Loop)', () => {
  const userId = 'test-user';
  const scenario = 'test-scenario';
  const context = 'Context info';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('executes a multi-step task successfully', async () => {
    // 1. Mock LLM responses for the loop
    (generateContent as jest.Mock)
      // Step 1: Thought -> Action (Find Recipe)
      .mockResolvedValueOnce(JSON.stringify({
        thought: "I need to find a cookie recipe.",
        action: "find_recipe",
        action_input: "cookies"
      }))
      // Step 2: Thought -> Action (Add to Planner)
      .mockResolvedValueOnce(JSON.stringify({
        thought: "I found the recipe. Now adding to planner.",
        action: "manage_planner",
        action_input: JSON.stringify({ action: "add_todo", data: "Buy flour" })
      }))
      // Step 3: Thought -> Final Answer (Proposed)
      .mockResolvedValueOnce(JSON.stringify({
        thought: "All done.",
        final_answer: "I found a recipe and updated your list."
      }))
      // Step 4: Critic (Validation)
      .mockResolvedValueOnce(JSON.stringify({
        valid: true
      }));

    // 2. Mock Tool Outputs
    (tools.find_recipe.function as jest.Mock).mockResolvedValue("Recipe found: Sugar Cookies");
    (tools.manage_planner.function as jest.Mock).mockResolvedValue({ success: true, message: "Added task" });

    // 3. Run Executor
    const result = await runAgentExecutor(userId, scenario, "Find cookies and add to list", context);

    // 4. Assertions
    expect(result.finalAnswer).toBe("I found a recipe and updated your list.");
    expect(result.steps).toHaveLength(8); 
    expect(tools.find_recipe.function).toHaveBeenCalledWith("cookies", expect.anything());
    expect(tools.manage_planner.function).toHaveBeenCalled();
  });

  it('self-corrects when the critic rejects an answer', async () => {
    // 1. Mock LLM responses
    (generateContent as jest.Mock)
      // Step 1: Action (Find Recipe)
      .mockResolvedValueOnce(JSON.stringify({
        thought: "Finding recipe.",
        action: "find_recipe",
        action_input: "cookies"
      }))
      // Step 2: Proposed Final Answer (Bad)
      .mockResolvedValueOnce(JSON.stringify({
        thought: "Found peanut cookies.",
        final_answer: "Here are Peanut Butter Cookies."
      }))
      // Step 3: Critic (Rejects due to allergy)
      .mockResolvedValueOnce(JSON.stringify({
        valid: false,
        reason: "User is allergic to peanuts."
      }))
      // Step 4: Action (Find Safe Recipe) - Retry
      .mockResolvedValueOnce(JSON.stringify({
        thought: "Ah, allergies. Finding nut-free recipe.",
        action: "find_recipe",
        action_input: "nut-free cookies"
      }))
      // Step 5: Proposed Final Answer (Good)
      .mockResolvedValueOnce(JSON.stringify({
        thought: "Found safe cookies.",
        final_answer: "Here are Sugar Cookies (Nut Free)."
      }))
      // Step 6: Critic (Validates)
      .mockResolvedValueOnce(JSON.stringify({
        valid: true
      }));

    // 2. Mock Tool Outputs
    (tools.find_recipe.function as jest.Mock)
        .mockResolvedValueOnce("Recipe: Peanut Butter Cookies")
        .mockResolvedValueOnce("Recipe: Sugar Cookies");

    // 3. Run Executor
    const result = await runAgentExecutor(userId, scenario, "I have a nut allergy. Find cookies.", context);

    // 4. Assertions
    expect(result.finalAnswer).toContain("Sugar Cookies");
    
    // Verify the trace contains the critique
    const traceString = result.steps.join('\n');
    expect(traceString).toContain("Critic: Your answer was rejected");
    expect(traceString).toContain("User is allergic to peanuts");
    
    // Verify find_recipe was called twice (initial + retry)
    expect(tools.find_recipe.function).toHaveBeenCalledTimes(2);
  });

  it('handles invalid JSON from LLM gracefully', async () => {
    (generateContent as jest.Mock)
      .mockResolvedValueOnce("Not JSON")
      .mockResolvedValueOnce(JSON.stringify({
        final_answer: "Recovered."
      }))
      .mockResolvedValueOnce(JSON.stringify({ valid: true }));

    const result = await runAgentExecutor(userId, scenario, "hi", context);
    
    expect(result.finalAnswer).toBe("Recovered.");
    expect(result.steps.join('\n')).toContain("System: Invalid JSON returned");
  });
});
