import { tools, toolDefinitions } from '../tools';
import { generateContent } from './llm';
import { SavedArtifacts } from '../routes/artifacts';

interface AgentResult {
    finalAnswer: string;
    steps: string[];
    artifactsUpdated: boolean;
    updatedArtifacts?: SavedArtifacts;
    lastToolUsed?: string;
    lastToolResult?: any;
}

/**
 * Critic Helper: Validates the agent's proposed answer against the user's request.
 */
const runCritic = async (prompt: string, contextInfo: string, proposedAnswer: string): Promise<{ valid: boolean; reason?: string }> => {
    const criticPrompt = `
    You are a critical reviewer. 
    User Request: "${prompt}"
    Context/Preferences: ${contextInfo}
    
    Agent's Proposed Answer: "${proposedAnswer}"
    
    Task: 
    1. Does the answer directly address the user's request?
    2. Does it violate any known preferences (allergies, dislikes, budget)?
    3. Is it helpful?
    
    If it is good, return JSON: { "valid": true }
    If it fails, return JSON: { "valid": false, "reason": "Explain exactly what is wrong so the agent can fix it." }
    Return ONLY JSON.
    `;

    try {
        const raw = await generateContent(criticPrompt);
        const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("Critic failed", e);
        return { valid: true }; // Fail open if critic errors
    }
};

/**
 * The Core ReAct (Reason-Act-Observe) Loop.
 * 
 * @param userId The user ID
 * @param scenario The current scenario slug
 * @param prompt The user's latest message
 * @param contextInfo Stringified context (artifacts, history, prefs)
 * @param maxSteps Safety limit for the loop
 */
export const runAgentExecutor = async (
    userId: string, 
    scenario: string, 
    prompt: string, 
    contextInfo: string, 
    maxSteps: number = 10
): Promise<AgentResult> => {
    
    const scratchpad: string[] = [];
    let finalAnswer = "";
    let artifactsUpdated = false;
    let lastArtifacts: SavedArtifacts | undefined;
    let lastToolUsed: string | undefined;
    let lastToolResult: any | undefined; // Capture data for UI

    // Initial System Prompt Construction
    const toolDesc = toolDefinitions.map(t => `- ${t.name}: ${t.description}`).join('\n');
    
    const systemPromptBase = `
    You are Santa's Elf, an autonomous holiday assistant.
    Scenario: ${scenario}
    
    CONTEXT:
    ${contextInfo}

    TOOLS AVAILABLE:
    ${toolDesc}

    YOUR GOAL:
    Answer the user's request by reasoning and using tools if necessary.
    You operate in a loop: Thought -> Action -> Observation.
    
    RESPONSE FORMAT:
    You must return a valid JSON object. No markdown outside the JSON.
    
    Option 1: Execute a Tool
    {
        "thought": "I need to check x...",
        "action": "tool_name",
        "action_input": "string input for the tool"
    }

    Option 2: Final Answer (When done)
    {
        "thought": "I have the answer...",
        "final_answer": "Your response to the user..."
    }

    RULES:
    1. If the user asks for something simple (e.g., "hi"), just give a "final_answer".
    2. If you need data (recipes, gifts, current plan status), use a tool.
    3. "action_input" must be a string. If the tool needs JSON, stringify it.
    4. Do not hallucinate tool outputs. Wait for the "Observation".
    5. Your final answer will be reviewed by a Critic. Ensure it meets all user preferences.
    6. SELF CORRECTION: If the Critic rejects your answer, analyze the specific reason (e.g. math error, missing constraint) and generate a *new* corrected Final Answer. Do not repeat the same answer.

    TOOL USAGE EXAMPLES:
    - manage_planner: { "action": "add_todo", "data": "Buy milk" } OR { "action": "set_budget", "data": 500 }
    - manage_plan: { "action": "create_plan", "data": { "title": "Party", "steps": ["Step 1", "Step 2"] } }
    `;

    console.log(`[AgentExecutor] Starting loop for: "${prompt}"`);

    for (let i = 0; i < maxSteps; i++) {
        // Construct the dynamic prompt with history
        const currentPrompt = `
        ${systemPromptBase}

        USER INPUT: "${prompt}"

        SCRATCHPAD (History of this task):
        ${scratchpad.join('\n')}

        (Step ${i + 1}/${maxSteps}) What is your next step? Return JSON.
        `;

        try {
            const rawResponse = await generateContent(currentPrompt);
            const cleanedResponse = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            
            let parsed;
            try {
                parsed = JSON.parse(cleanedResponse);
            } catch (e) {
                // Self-correction attempt
                console.warn(`[AgentExecutor] JSON Parse Error on step ${i}:`, cleanedResponse);
                scratchpad.push(`System: Invalid JSON returned. Please format as strict JSON.`);
                continue;
            }

            if (parsed.final_answer) {
                // Run Critic before accepting
                console.log(`[AgentExecutor] Proposing answer. Running critic...`);
                const critique = await runCritic(prompt, contextInfo, parsed.final_answer);
                
                if (critique.valid) {
                    finalAnswer = parsed.final_answer;
                    scratchpad.push(`Thought: ${parsed.thought}`);
                    scratchpad.push(`Final Answer: ${parsed.final_answer}`);
                    break;
                } else {
                    console.log(`[AgentExecutor] Critic rejected: ${critique.reason}`);
                    scratchpad.push(`Thought: ${parsed.thought}`);
                    scratchpad.push(`Critic: Your answer was rejected. Reason: ${critique.reason}. Please fix this and try again.`);
                    // Don't break; loop continues to let agent fix it
                    continue;
                }
            }

            if (parsed.action && tools[parsed.action]) {
                scratchpad.push(`Thought: ${parsed.thought}`);
                scratchpad.push(`Action: ${parsed.action}("${parsed.action_input}")`);
                console.log(`[AgentExecutor] Executing ${parsed.action}...`);

                try {
                    // Execute Tool
                    // We pass context (userId, scenario) so tools like 'manage_planner' work
                    const result = await tools[parsed.action].function(parsed.action_input, { userId, scenario });
                    
                    // Capture tool usage for UI hints
                    lastToolUsed = parsed.action;
                    lastToolResult = result;
                    
                    // Standardize Output
                    let outputStr = "";
                    if (typeof result === 'string') {
                        outputStr = result;
                    } else {
                        outputStr = JSON.stringify(result);
                        // Capture updated artifacts if available (for UI refresh)
                        if (result.artifacts) {
                            lastArtifacts = result.artifacts;
                            artifactsUpdated = true;
                        }
                        if (result.success === false && result.message) {
                            outputStr = `Error: ${result.message}`;
                        }
                    }

                    // Truncate long outputs to save context window
                    if (outputStr.length > 2000) {
                        outputStr = outputStr.substring(0, 2000) + "... [truncated]";
                    }

                    scratchpad.push(`Observation: ${outputStr}`);

                } catch (toolErr: any) {
                    scratchpad.push(`Observation: Tool Execution Error - ${toolErr.message}`);
                }
            } else {
                scratchpad.push(`System: Unknown action "${parsed.action}". Valid tools: ${toolDefinitions.map(t => t.name).join(', ')}`);
            }

        } catch (llmErr: any) {
            console.error("[AgentExecutor] LLM Error", llmErr);
            scratchpad.push(`System: LLM Generation Error. Stopping.`);
            finalAnswer = "I encountered an error while thinking. Please try again.";
            break;
        }
    }

    if (!finalAnswer) {
        finalAnswer = "I stopped because I hit the thinking limit. However, I have performed some actions (check the plan below).";
    }

    return {
        finalAnswer,
        steps: scratchpad,
        artifactsUpdated,
        updatedArtifacts: lastArtifacts,
        lastToolUsed,
        lastToolResult
    };
};
