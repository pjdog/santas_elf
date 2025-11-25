# Agentic ReAct Loop Implementation Plan

## Objective
Upgrade the server-side agent from a **Single-Turn Classifier** to a **Multi-Step ReAct (Reason-Act-Observe) Loop**. This enables the agent to autonomously chain tools (e.g., "Find a recipe AND add the ingredients to the shopping list") without user micro-management.

## Core Architecture: The Execution Loop

### 1. The "Brain" (Prompt Strategy)
Replace the current `classificationPrompt` in `server/src/routes/agent.ts` with a generic **Agent Executor** prompt.
- **Input:** Chat History, User Preferences, Current Plan, Available Tools.
- **Output Format:** Structured JSON (strictly enforced) allowing either a **Tool Call** or a **Final Answer**.
  ```json
  // Option A: Action
  {
    "thought": "I need to find a recipe first.",
    "action": "find_recipe",
    "action_input": "chocolate cookies"
  }
  // Option B: Final Answer
  {
    "thought": "I have completed all tasks.",
    "final_answer": "I found the recipe and added it to your list!"
  }
  ```

### 2. Server-Side Loop (`server/src/routes/agent.ts`)
Implement a `while` loop in the `/chat` endpoint:
- **Max Iterations:** Hard limit (e.g., 5 or 8) to prevent infinite loops/cost spikes.
- **Scratchpad:** A string or array accumulating the reasoning trace (`Thought` -> `Action` -> `Observation`).
- **Execution Logic:**
  1. Construct Prompt (System + Context + Scratchpad).
  2. Call LLM (`generateContent`).
  3. Parse JSON.
  4. **If Final Answer:** Break loop, return response to client.
  5. **If Action:** 
     - Execute the specific Tool function.
     - Capture output (or error string).
     - Append `Observation: [Tool Output]` to Scratchpad.
     - Continue loop.

### 3. Tool Standardization (`server/src/tools.ts`)
Ensure all tools return stringified, context-rich outputs.
- **Current:** Some tools return objects, some strings.
- **Update:** Wrap tool outputs to ensure the LLM understands them (e.g., "Successfully added 3 items" vs just "true").
- **Error Handling:** Tools must catch their own errors and return them as strings ("Error: API timed out") so the Agent can see the error and try a different approach (Self-Correction).

## UI Updates (Client)

### 1. "Thinking" Visibility
The user needs to know *why* the request is taking longer (since it might run 3-4 LLM calls).
- **API Response:** Include a `trace` or `steps` array in the final JSON response.
- **Frontend:** Update `ThinkingElf` or the chat bubble to show a collapsible "View Reasoning" log (e.g., "Searching for gifts..." -> "Updating planner..." -> "Done").

## Implementation Steps

1.  **Refactor `tools.ts`:** Ensure `tools` registry serves both the prompt description and the execution function in a unified format suitable for the new loop.
2.  **Implement `runAgentLoop`:** Create the core recursive function in `server/src/utils/agentExecutor.ts` (new file) to keep the route handler clean.
3.  **Connect Route:** Update `POST /api/agent/chat` to invoke `runAgentLoop`.
4.  **Client Feedback:** Add `reasoning_trace` to the API response type and display it in the chat UI.

## Risks & Mitigations
- **Latency:** 3+ LLM calls will be slow. 
  - *Mitigation:* Use a faster model (Gemini Flash) for the intermediate steps and a stronger one for the final synthesis if needed.
- **Loops:** Agent getting stuck repeatedly trying the same failed action.
  - *Mitigation:* Inject a "System Hint" into the scratchpad if an action fails twice: "You have tried this before. Try a different tool or ask the user."
