import { tools, toolDefinitions } from '../tools';
import { generateContent, generateContentStream } from './llm';
import { SavedArtifacts } from '../routes/artifacts';

interface AgentResult {
    finalAnswer: string;
    steps: string[];
    artifactsUpdated: boolean;
    updatedArtifacts?: SavedArtifacts;
    lastToolUsed?: string;
    lastToolResult?: any;
    chainedInstruction?: string;
}

interface AgentProgress {
    step: number;
    maxSteps: number;
    status: 'starting' | 'thinking' | 'tool' | 'finalizing' | 'error' | 'done';
    message: string;
    steps: string[];
    lastToolUsed?: string;
}

const STREAM_TIMEOUT_MS = Number(process.env.LLM_STREAM_TIMEOUT_MS || 20000);
const CRITIC_TIMEOUT_MS = Number(process.env.LLM_CRITIC_TIMEOUT_MS || 15000);
const AGENT_LOOP_TIMEOUT_MS = Number(process.env.AGENT_LOOP_TIMEOUT_MS || 28000);

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
        const raw = await generateContent(criticPrompt, undefined, CRITIC_TIMEOUT_MS);
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
    maxSteps: number = 10,
    timeoutMs: number = AGENT_LOOP_TIMEOUT_MS,
    onProgress?: (progress: AgentProgress) => Promise<void> | void
): Promise<AgentResult> => {
    
    const scratchpad: string[] = [];
    let finalAnswer = "";
    let artifactsUpdated = false;
    let lastArtifacts: SavedArtifacts | undefined;
    let lastToolUsed: string | undefined;
    let lastToolResult: any | undefined; // Capture data for UI
    const startTime = Date.now();

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
    7. Use 'manage_planner' ONLY for simple text-based todo items, budget setting, table management, or preference updates. Do NOT use it for structured content like recipes or gifts.
    8. Use 'add_recipe_to_artifacts' specifically to save a structured recipe object (found via 'find_recipe') into the planner.
    9. If the user states a preference (dietary restriction, gift recipient info, decoration style, or budget), immediately use 'manage_planner' with action 'set_preferences' to save it. Do this before searching.
    10. COMPLEX TASKS: If the user request requires multiple steps (e.g., "Plan a party for 12 with $500"), break it down.
        - First, acknowledge the plan (e.g., set budget).
        - Then, use 'chain_task' to immediately trigger the next step (e.g., "Now add guests").
        - 'chain_task' allows you to "return" a partial result and immediately start a new agent run for the next part.
        - Use 'chain_task' instead of 'final_answer' if there is more work to be done autonomously.

    TOOL USAGE EXAMPLES:
    - manage_planner: { "action": "add_todo", "data": "Buy milk" } OR { "action": "set_budget", "data": 500 }. Use for simple tasks or budget setting.
    - manage_planner (preferences): { "action": "set_preferences", "data": { "dietary": { "allergies": ["peanuts"] } } }
    - manage_plan: { "action": "create_plan", "data": { "title": "Party", "steps": ["Step 1", "Step 2"] } }. Use for high-level multi-step plans.
    - find_recipe: "cookies". Use when the user asks for a recipe.
    - add_recipe_to_artifacts: "{\"name\":\"Cookies\",\"description\":\"Yummy cookies\",\"ingredients\":[],\"instructions\":[]}". Use this AFTER 'find_recipe' to save the found recipe.
    - switch_scenario: "christmas-party". Use to change the active planning context.
    - delete_scenario: "confirm". Use to clear all data for the current scenario (must ask user for confirmation first).
    `;

    console.log(`[AgentExecutor] Starting loop for: "${prompt}"`);

    const sendProgress = async (status: AgentProgress['status'], message: string, stepIndex = 0) => {
        if (!onProgress) return;
        try {
            await onProgress({
                status,
                message,
                step: stepIndex,
                maxSteps,
                steps: [...scratchpad],
                lastToolUsed
            });
        } catch (err) {
            console.warn('[AgentExecutor] Progress hook failed', err);
        }
    };

    await sendProgress('starting', 'Warming up the sleigh...', 0);

    for (let i = 0; i < maxSteps; i++) {
        // Check for Timeout
        if (Date.now() - startTime > timeoutMs) {
            console.warn(`[AgentExecutor] Timeout reached (${timeoutMs}ms). Soft chaining.`);
            await sendProgress('done', 'Taking a breather, then continuing...', i + 1);
            return {
                finalAnswer: "I'm breaking this task down to ensure I don't timeout.",
                steps: [...scratchpad, "System: Soft timeout. Chaining."],
                artifactsUpdated,
                updatedArtifacts: lastArtifacts,
                lastToolUsed: 'chain_task',
                chainedInstruction: `Continue the previous request: ${prompt}`
            };
        }

        // Construct the dynamic prompt with history
        const currentPrompt = `
        ${systemPromptBase}

        USER INPUT: "${prompt}"

        SCRATCHPAD (History of this task):
        ${scratchpad.join('\n')}

        (Step ${i + 1}/${maxSteps}) What is your next step? Return JSON.
        `;

        try {
            let rawResponse = "";
            const stream = generateContentStream(currentPrompt, undefined, STREAM_TIMEOUT_MS);
            let lastUpdate = Date.now();

            for await (const chunk of stream) {
                rawResponse += chunk;
                // Update progress frequently (200ms) to show the thought process live
                if (Date.now() - lastUpdate > 200) {
                    // Show the last 500 chars so the user sees the latest "thinking" text
                    const displayMsg = rawResponse.length > 500 ? "..." + rawResponse.slice(-500) : rawResponse;
                    await sendProgress('thinking', displayMsg, i + 1);
                    lastUpdate = Date.now();
                }
            }
            
            let parsed;
            try {
                // 1. Try standard cleanup first
                const cleanedResponse = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
                parsed = JSON.parse(cleanedResponse);
            } catch (e) {
                try {
                    // 2. Fallback: Extract JSON substring
                    const firstOpen = rawResponse.indexOf('{');
                    const lastClose = rawResponse.lastIndexOf('}');
                    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
                         const potentialJson = rawResponse.substring(firstOpen, lastClose + 1);
                         parsed = JSON.parse(potentialJson);
                    } else {
                        throw new Error("Could not find valid JSON in response.");
                    }
                } catch (parseErr: any) {
                     console.warn(`[AgentExecutor] JSON Parse/Validation Error on step ${i}:`, parseErr.message);
                     scratchpad.push(`System: Invalid JSON returned (${parseErr.message}). Please format as strict JSON with "action" or "final_answer".`);
                     await sendProgress('thinking', 'Fixing JSON formatting...', i + 1);
                     continue;
                }
            }

            if (typeof parsed !== 'object' || parsed === null || (!parsed.final_answer && !parsed.action)) {
                 const msg = "Response missing 'final_answer' or 'action'";
                 console.warn(`[AgentExecutor] Validation Error on step ${i}:`, msg);
                 scratchpad.push(`System: Invalid JSON structure (${msg}).`);
                 await sendProgress('thinking', 'Fixing JSON structure...', i + 1);
                 continue;
            }

            if (parsed.final_answer) {
                // Run Critic before accepting
                console.log(`[AgentExecutor] Proposing answer. Running critic...`);
                await sendProgress('finalizing', 'Reviewing answer...', i + 1);
                const critique = await runCritic(prompt, contextInfo, parsed.final_answer);
                
                if (critique.valid) {
                    finalAnswer = parsed.final_answer;
                    scratchpad.push(`Thought: ${parsed.thought}`);
                    scratchpad.push(`Final Answer: ${parsed.final_answer}`);
                    await sendProgress('done', 'Ready to deliver!', i + 1);
                    break;
                } else {
                    console.log(`[AgentExecutor] Critic rejected: ${critique.reason}`);
                    scratchpad.push(`Thought: ${parsed.thought}`);
                    scratchpad.push(`Critic: Your answer was rejected. Reason: ${critique.reason}. Please fix this and try again.`);
                    await sendProgress('thinking', 'Critic asked for a fix...', i + 1);
                    // Don't break; loop continues to let agent fix it
                    continue;
                }
            }

            if (parsed.action && tools[parsed.action]) {
                scratchpad.push(`Thought: ${parsed.thought}`);
                scratchpad.push(`Action: ${parsed.action}("${parsed.action_input}")`);
                console.log(`[AgentExecutor] Executing ${parsed.action}...`);
                await sendProgress('tool', `Using ${parsed.action}...`, i + 1);

                try {
                    // Execute Tool
                    // We pass context (userId, scenario) so tools like 'manage_planner' work
                    const result = await tools[parsed.action].function(parsed.action_input, { userId, scenario });
                    
                    // Check for chain_task immediate return
                    if (parsed.action === 'chain_task') {
                        await sendProgress('done', `Chaining: ${result.chainedInstruction}`, i + 1);
                        return {
                            finalAnswer: result.message,
                            steps: scratchpad,
                            artifactsUpdated,
                            updatedArtifacts: lastArtifacts,
                            lastToolUsed: 'chain_task',
                            lastToolResult: result,
                            chainedInstruction: result.chainedInstruction
                        };
                    }
                    
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
                    await sendProgress('thinking', 'Got a result, planning next step...', i + 1);

                } catch (toolErr: any) {
                    scratchpad.push(`Observation: Tool Execution Error - ${toolErr.message}`);
                    await sendProgress('error', `Tool failed: ${toolErr.message}`, i + 1);
                }
            } else {
                scratchpad.push(`System: Unknown action "${parsed.action}". Valid tools: ${toolDefinitions.map(t => t.name).join(', ')}`);
                await sendProgress('error', `Unknown action ${parsed.action}`, i + 1);
            }

        } catch (llmErr: any) {
            console.error("[AgentExecutor] LLM Error", llmErr);
            scratchpad.push(`System: LLM Generation Error. Stopping.`);
            finalAnswer = "I encountered an error while thinking. Please try again.";
            await sendProgress('error', 'LLM error halted the run.', i + 1);
            break;
        }
    }

    if (!finalAnswer) {
        finalAnswer = "I stopped because I hit the thinking limit. However, I have performed some actions (check the plan below).";
        await sendProgress('done', 'Hit safety limit, wrapping up.', maxSteps);
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
