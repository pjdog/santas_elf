import { Router, Request, Response } from 'express';
import multer from 'multer';
import { generateContent } from '../utils/llm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getConfig } from '../utils/configManager';
import redisClient from '../config/db';
import { INITIAL_ARTIFACTS, SavedArtifacts } from './artifacts';
import { fetchSocialSuggestions } from '../utils/social';
import { sanitizeScenario } from '../utils/scenario';
import { runAgentExecutor } from '../utils/agentExecutor';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Loads artifacts from Redis for a given user and scenario.
 * Merges with initial defaults to ensure a valid structure.
 * 
 * @param userId - The user's unique ID.
 * @param scenario - The scenario slug.
 * @returns The user's SavedArtifacts.
 */
const loadArtifacts = async (userId: string, scenario: string): Promise<SavedArtifacts> => {
    const key = `santas_elf:artifacts:${userId}:${sanitizeScenario(scenario)}`;
    const data = await redisClient.get(key);
    const artifacts = data ? JSON.parse(data) : {};
    return {
        ...INITIAL_ARTIFACTS,
        ...artifacts,
        todos: Array.isArray(artifacts?.todos) ? artifacts.todos : [],
        recipes: Array.isArray(artifacts?.recipes) ? artifacts.recipes : [],
        gifts: Array.isArray(artifacts?.gifts) ? artifacts.gifts : [],
        decorations: Array.isArray(artifacts?.decorations) ? artifacts.decorations : [],
        seating: Array.isArray(artifacts?.seating) ? artifacts.seating : [],
        budget: artifacts?.budget || { limit: 0 },
        agentNotes: Array.isArray(artifacts?.agentNotes) ? artifacts.agentNotes : [],
        preferences: artifacts?.preferences || INITIAL_ARTIFACTS.preferences,
        plan: artifacts?.plan || null
    };
};

/**
 * Retrieves recent chat history from Redis.
 * 
 * @param userId - The user's ID.
 * @param scenario - The scenario slug.
 * @param limit - Max messages to retrieve (default 5).
 * @returns A formatted string of chat history.
 */
const getChatHistory = async (userId: string, scenario: string, limit = 5): Promise<string> => {
    try {
        const key = `chat:${userId}:${sanitizeScenario(scenario)}`;
        const rawMessages = await redisClient.lRange(key, -limit, -1);
        return rawMessages.map(m => {
            try {
                const parsed = JSON.parse(m);
                return `${parsed.sender === 'user' ? 'User' : 'Assistant'}: ${parsed.text}`;
            } catch(e) { return ""; }
        }).join('\n');
    } catch (e) {
        return "";
    }
};

/**
 * Helper to fetch artifacts for context injection.
 * Formats the artifacts into a human-readable string for the LLM.
 * 
 * @param userId - The user's ID.
 * @param scenario - The scenario slug.
 * @param artifactsOverride - Optional artifacts to use instead of fetching from DB.
 * @returns A string representation of the current planner state.
 */
const getArtifactsContext = async (userId: string, scenario: string, artifactsOverride?: SavedArtifacts) => {
    try {
        const artifacts = artifactsOverride || await loadArtifacts(userId, scenario);
        const foundationNote = artifacts.agentNotes.find((note: any) => note.id === `foundation-${sanitizeScenario(scenario)}`);
        const todosList = Array.isArray(artifacts.todos) ? artifacts.todos : [];
        const seatingList = Array.isArray(artifacts.seating) ? artifacts.seating : [];
        const prefs = artifacts.preferences || INITIAL_ARTIFACTS.preferences;
        const plan = artifacts.plan;

        let planContext = "No active plan.";
        if (plan) {
            planContext = `Active Plan: "${plan.title}"\nSteps:\n${plan.steps.map(s => `- [${s.status.toUpperCase()}] ${s.description} (ID: ${s.id})`).join('\n')}`;
        }

        return `
        Scenario: ${sanitizeScenario(scenario)}
        Current Planner State:
        - Todos: ${todosList.map((t: any) => t.text).join(', ') || 'None yet'}
        - Budget Limit: $${artifacts.budget?.limit || 0}
        - Tables: ${seatingList.map((t: any) => `${t.name} (${t.guests.length}/${t.seats})`).join(', ') || 'None'}
        - Foundation Note: ${foundationNote?.content || 'Not captured yet'}
        
        ${planContext}

        Known Preferences:
        - Dietary: Allergies [${prefs.dietary?.allergies?.join(', ')}], Dislikes [${prefs.dietary?.dislikes?.join(', ')}], Diets [${prefs.dietary?.diets?.join(', ')}]
        - Gifts: Recipient [${prefs.gifts?.recipientRelationship}], Interests [${prefs.gifts?.recipientInterests?.join(', ')}], Budget [$${prefs.gifts?.budgetMin}-$${prefs.gifts?.budgetMax}]
        - Decorations: Style [${prefs.decorations?.style}], Colors [${prefs.decorations?.preferredColors?.join(', ')}]
        `;
    } catch (e) {
        return "";
    }
};

/**
 * Checks if foundation notes exist and creates them if not.
 * Uses the LLM to analyze the initial prompt and extract key event details.
 * 
 * @param userId - The user's ID.
 * @param scenario - The scenario slug.
 * @param prompt - The user's input prompt.
 * @param artifacts - Optional existing artifacts.
 * @returns The updated artifacts with foundation notes if created.
 */
const ensureFoundationNotes = async (userId: string, scenario: string, prompt: string, artifacts?: SavedArtifacts): Promise<SavedArtifacts> => {
    const scenarioKey = sanitizeScenario(scenario);
    const current = artifacts || await loadArtifacts(userId, scenarioKey);
    const hasFoundation = current.agentNotes.some((n) => n.id === `foundation-${scenarioKey}`);
    const hasProfile = current.agentNotes.some((n) => n.id === `profile-${scenarioKey}`);
    if (hasFoundation && hasProfile) return current;

    let parsed: any = {};
    try {
        const llmPrompt = `
        You are summarizing a holiday plan to create two quick notes.
        Scenario name: ${scenarioKey}
        Most recent user message: "${prompt}"

        Infer what the user is planning for (occasion), key people involved, and whether the plan needs gifts, dinner/food, or a seating chart.
        Also determine which planner features are needed based on the request: "recipes", "gifts", "decorations", "seating".
        Suggest 3-5 initial high-level to-do items for this event.
        Return JSON ONLY:
        {
            "occasion": "string",
            "people": ["name or role", "..."],
            "needsGifts": boolean,
            "needsDinner": boolean,
            "needsSeating": boolean,
            "features": ["recipes", "gifts", "decorations", "seating"],
            "todos": ["task 1", "task 2", ...],
            "tone": "cozy / formal / party / family / other",
            "notes": "one or two short sentences",
            "priorities": ["short bullet priorities"],
            "funFact": "A quick, interesting 1-sentence fun fact or tradition related to this specific occasion (search your knowledge base)."
        }`;
        const text = await generateContent(llmPrompt);
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        parsed = JSON.parse(cleaned);
    } catch (err) {
        parsed = {
            occasion: 'Holiday gathering',
            people: [],
            needsGifts: true,
            needsDinner: true,
            needsSeating: false,
            features: ['recipes', 'gifts', 'decorations'],
            todos: [],
            tone: 'festive',
            notes: 'Foundation details pending more info from the user.',
            priorities: [],
            funFact: "Did you know? The tradition of holiday planning dates back centuries!"
        };
    }

    const foundationContent = [
        `Occasion: ${parsed.occasion || 'TBD'}`,
        `People involved: ${(parsed.people && parsed.people.length > 0) ? parsed.people.slice(0, 8).join(', ') : 'Not shared yet'}`,
        `Gifts needed: ${parsed.needsGifts ? 'Yes' : 'Not mentioned yet'}`,
        `Dinner/food: ${parsed.needsDinner ? 'Yes' : 'Not mentioned yet'}`,
        `Seating plan: ${parsed.needsSeating ? 'Needed or likely' : 'Not requested yet'}`,
        `Tone: ${parsed.tone || 'Not defined'}`,
        `Notes: ${parsed.notes || 'Pending details'}`
    ].join('\n');

    const profileRows = [
        ['Scenario', scenarioKey],
        ['Occasion', parsed.occasion || 'TBD'],
        ['People', (parsed.people && parsed.people.length > 0) ? parsed.people.slice(0, 5).join(', ') : 'Add names & roles'],
        ['Priorities', parsed.priorities && parsed.priorities.length ? parsed.priorities.slice(0, 3).join(' • ') : 'List top 3 priorities'],
        ['Gifts', parsed.needsGifts ? 'Plan gifts' : 'Optional'],
        ['Dinner', parsed.needsDinner ? 'Plan menu & timing' : 'Not yet'],
        ['Seating', parsed.needsSeating ? 'Assign seats/tables' : 'Open seating']
    ];

    const updatedNotes = [...current.agentNotes];
    let addedFoundation = false;
    const newTodos = [...current.todos];

    if (!hasFoundation) {
        updatedNotes.unshift({
            id: `foundation-${scenarioKey}`,
            title: `Foundation (${scenarioKey})`,
            type: 'text',
            content: foundationContent.substring(0, 5000)
        });
        
        // Add generated todos if this is a fresh start
        if (Array.isArray(parsed.todos) && parsed.todos.length > 0) {
            parsed.todos.forEach((t: string) => {
                if (typeof t === 'string') {
                    newTodos.push({
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                        text: t,
                        completed: false
                    });
                }
            });
        }
        addedFoundation = true;
    }
    if (!hasProfile) {
        updatedNotes.unshift({
            id: `profile-${scenarioKey}`,
            title: `Profile (${scenarioKey})`,
            type: 'table',
            tableRows: profileRows
        });
    }

    // Only update features if we are creating the foundation (first run)
    const features = (addedFoundation && Array.isArray(parsed.features)) ? parsed.features : current.features;

    const updatedArtifacts: SavedArtifacts = {
        ...current,
        todos: newTodos,
        agentNotes: updatedNotes.slice(0, 20), // respect validation limit
        features: features || ['recipes', 'gifts', 'decorations']
    };
    
    // Hack: Attach funFact and todos to the object temporarily so we can grab it in the main route
    // @ts-ignore
    if (addedFoundation) {
        // @ts-ignore
        updatedArtifacts.tempFunFact = parsed.funFact;
        // @ts-ignore
        updatedArtifacts.tempGeneratedTodos = parsed.todos;
    }

    const key = `santas_elf:artifacts:${userId}:${scenarioKey}`;
    await redisClient.set(key, JSON.stringify(updatedArtifacts));
    return updatedArtifacts;
};

/**
 * POST /api/agent/chat
 * Main conversational endpoint for the AI Agent.
 * Supports optional image upload for multimodal interactions.
 * 
 * Flow:
 * 1. Load artifacts and ensure foundation notes exist.
 * 2. Check for social sentiment shortcut.
 * 3. Execute the autonomous agent loop (Reason-Act-Observe).
 * 4. Save chat history and return response.
 */
router.post('/chat', upload.single('image'), async (req: Request, res: Response) => {
    const { prompt } = req.body;
    const file = req.file;
    // @ts-ignore
    const userId = req.user?.id;
    const scenario = sanitizeScenario((req.query.scenario as string) || (req.body?.scenario as string));
    let artifactsUpdatedFlag = false;
    let artifactsForScenario: SavedArtifacts | null = null;
    let funFact: string | undefined;
    let generatedTodos: string[] | undefined;

    if (userId) {
        try {
            artifactsForScenario = await loadArtifacts(userId, scenario);
            if (prompt) {
                const beforeNotes = artifactsForScenario?.agentNotes?.length || 0;
                artifactsForScenario = await ensureFoundationNotes(userId, scenario, prompt, artifactsForScenario);
                // @ts-ignore
                if (artifactsForScenario.tempFunFact) {
                    // @ts-ignore
                    funFact = artifactsForScenario.tempFunFact;
                    // @ts-ignore
                    delete artifactsForScenario.tempFunFact;
                }
                // @ts-ignore
                if (artifactsForScenario.tempGeneratedTodos) {
                    // @ts-ignore
                    generatedTodos = artifactsForScenario.tempGeneratedTodos;
                    // @ts-ignore
                    delete artifactsForScenario.tempGeneratedTodos;
                }

                if ((artifactsForScenario?.agentNotes?.length || 0) > beforeNotes) {
                    artifactsUpdatedFlag = true;
                }
            }
        } catch (loadErr) {
            console.error('Failed to load artifacts for scenario', scenario, loadErr);
        }
    }
    
    if (!prompt && !file) {
        return res.status(400).json({ message: 'Prompt or image is required.' });
    }

    try {
        // Handling Multimodal Input (Image + Text)
        if (file) {
            // ... (Same as before for image logic) ...
            const config = getConfig();
            if (!config.llm?.apiKey) throw new Error("LLM API Key missing");
            
            const genAI = new GoogleGenerativeAI(config.llm.apiKey);
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

            const imagePart = {
                inlineData: {
                    data: file.buffer.toString("base64"),
                    mimeType: file.mimetype,
                },
            };

            const visionPrompt = prompt || "What suggestions do you have for this?";
            const fullPrompt = `${visionPrompt} 
            
            If this looks like a room, suggest decoration themes.
            If it looks like food, maybe suggest a recipe or plating. 
            
            Format your response as a valid JSON object with:
            {
                "type": "decoration" | "recipe" | "chat",
                "message": "Your friendly advice here...",
                "data": "The detailed suggestions text or object"
            }
            Return ONLY JSON.`;

            const result = await model.generateContent([fullPrompt, imagePart]);
            const text = result.response.text();
            const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            
            let responseData;
            try {
                responseData = JSON.parse(cleanedText);
            } catch (e) {
                responseData = {
                    type: 'decoration',
                    message: "Here are my thoughts:",
                    data: text
                };
            }

            if (userId) {
                await saveMessage(userId, scenario, { sender: 'user', text: prompt || "[Image Uploaded]", type: 'text' });
                await saveMessage(userId, scenario, { sender: 'ai', text: responseData.message, type: responseData.type, data: responseData.data });
            }
            return res.json(responseData);
        }

        // 1. Intent Recognition & Execution (ReAct Loop)
        const contextInfo = userId ? await getArtifactsContext(userId, scenario, artifactsForScenario || undefined) : "";
        const history = userId ? await getChatHistory(userId, scenario) : "";
        const lower = (prompt || '').toLowerCase();

        // Shortcut: social sentiment
        if (lower.includes('reddit') || lower.includes('social') || lower.includes('people are saying')) {
            try {
                const posts = await fetchSocialSuggestions(prompt);
                if (userId) {
                    await saveMessage(userId, scenario, { sender: 'user', text: prompt || "", type: 'text' });
                    await saveMessage(userId, scenario, { sender: 'ai', text: 'Here is what people are saying:', type: 'social', data: posts });
                }
                return res.json({ type: 'social', message: 'Here is what people are saying:', data: posts });
            } catch (e) {
                console.error('Social scrape failed', e);
            }
        }
        
        // EXECUTE THE AGENT LOOP
        const agentResult = await runAgentExecutor(userId, scenario, prompt, contextInfo + `\n\nHISTORY:\n${history}`);
        
        let replyMessage = agentResult.finalAnswer;
        let replyType = 'chat';
        let replyData: SavedArtifacts | string | undefined | any = agentResult.updatedArtifacts;

        // Map tool usage to UI types for widgets
        if (agentResult.lastToolUsed === 'find_recipe' || agentResult.lastToolUsed === 'add_recipe_to_artifacts') {
            replyType = 'recipe';
            replyData = agentResult.lastToolResult;
        } else if (agentResult.lastToolUsed === 'find_gift') {
            replyType = 'gift';
            replyData = agentResult.lastToolResult;
        } else if (agentResult.lastToolUsed === 'get_decoration_suggestions') {
            replyType = 'decoration';
            replyData = agentResult.lastToolResult;
        } else if (agentResult.lastToolUsed === 'commerce_checkout' || agentResult.lastToolUsed === 'find_product_insights') {
            replyType = 'commerce';
            replyData = agentResult.lastToolResult;
        } else if (agentResult.lastToolUsed === 'switch_scenario') {
            // Special handling for scenario switch: tell the frontend to change context
            replyType = 'switch_scenario';
            replyData = sanitizeScenario(agentResult.lastToolResult?.scenarioName);
            // The message from the tool ("Switching to...") is already in finalAnswer usually, 
            // but we can enforce it if the agent didn't say it.
            if (!replyMessage) replyMessage = `Switching to ${replyData}...`;
        }

        // Inject fun fact and todos if we just established the foundation
        if (funFact) {
             const prettyName = scenario.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
             replyMessage += `\n\n💡 **Fun Fact:** ${funFact}`;
        }
        
        if (generatedTodos && generatedTodos.length > 0) {
            const todoList = generatedTodos.map(t => `- ${t}`).join('\n');
            replyMessage += `\n\nI've added a few initial tasks to get you started:\n${todoList}\n\nDoes this look right?`;
        }

        // Save History
        if (userId) {
            const userMsg = { sender: 'user', text: prompt || (file ? "[Image Uploaded]" : ""), type: 'text' };
            const aiMsg = { 
                sender: 'ai', 
                text: replyMessage, 
                type: replyType, 
                data: replyData, // Can carry full state payload if needed
                trace: agentResult.steps // Save reasoning trace!
            };
            await saveMessage(userId, scenario, userMsg);
            await saveMessage(userId, scenario, aiMsg);
        }

        return res.json({
            type: replyType,
            message: replyMessage,
            data: replyData, // Send back updated state
            artifactsUpdated: agentResult.artifactsUpdated || artifactsUpdatedFlag,
            trace: agentResult.steps
        });

    } catch (error: any) {
        console.error('Error in agent chat:', error);
        res.status(500).json({ 
            type: 'error', 
            message: 'Failed to process request' 
        });
    }
});

router.get('/history', async (req: Request, res: Response) => {
    // @ts-ignore
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const scenario = sanitizeScenario(req.query.scenario as string);

    try {
        const key = `chat:${userId}:${scenario}`;
        const rawMessages = await redisClient.lRange(key, 0, -1);
        const messages = rawMessages.map(m => {
            try { return JSON.parse(m); } catch(e) { return null; }
        }).filter(m => m);
        res.json(messages);
    } catch (error) {
        console.error('Error fetching chat history:', error);
        res.status(500).json({ message: 'Failed to fetch history' });
    }
});

const saveMessage = async (userId: string, scenario: string, message: any) => {
    try {
        const key = `chat:${userId}:${sanitizeScenario(scenario)}`;
        await redisClient.rPush(key, JSON.stringify(message));
        await redisClient.lTrim(key, -50, -1); // Keep last 50 per scenario
    } catch (e) {
        console.error("Failed to save chat message", e);
    }
};

export default router;