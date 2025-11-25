# Agentic Upgrade Plan: Reflection & Critique

## Objective
Implement a **Self-Reflection (Critic)** step in the agent execution loop. This aligns with late 2025 research on "Metacognitive Agents" that verify their output before showing it to the user, reducing hallucinations and safety errors.

## Implementation Strategy

### 1. The Critic Prompt
Create a new helper `runCritic` in `agentExecutor.ts`.
- **Input:** Original User Prompt, User Preferences, Agent's Proposed Final Answer.
- **Task:** Verify if the answer addresses the prompt and respects constraints (e.g., dietary restrictions).
- **Output:** `valid: boolean`, `critique: string`.

### 2. Modify `runAgentExecutor` Loop
Intercept the `final_answer` condition:
```typescript
if (parsed.final_answer) {
    // NEW: Run Critic
    const critique = await runCritic(prompt, prefs, parsed.final_answer);
    if (critique.valid) {
        return FinalAnswer;
    } else {
        // Add critique to scratchpad and CONTINUE loop
        scratchpad.push(`Critic: I cannot accept that answer. ${critique.reason}. Please fix it.`);
        continue; 
    }
}
```

### 3. Update Prompt
Inform the agent in the `systemPromptBase` that a Critic will review its work, encouraging it to be thorough.

## Benefits
- **Safety:** Prevents suggesting peanut recipes to allergic users.
- **Accuracy:** Catches "I couldn't find that" if the tool actually returned data but the agent missed it.
- **Autonomy:** Allows the agent to self-correct without user intervention.
