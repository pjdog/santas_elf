import { Router, Request, Response } from 'express';
import multer from 'multer';
import { generateContent } from '../utils/llm';
import { tools } from '../tools';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getConfig } from '../utils/configManager';
import redisClient from '../config/db';
import { INITIAL_ARTIFACTS, SavedArtifacts } from './artifacts';
import { fetchSocialSuggestions } from '../utils/social';
import { sanitizeScenario } from '../utils/scenario';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

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
        agentNotes: Array.isArray(artifacts?.agentNotes) ? artifacts.agentNotes : []
    };
};

/**
 * Helper to fetch artifacts for context injection
 */
const getArtifactsContext = async (userId: string, scenario: string, artifactsOverride?: SavedArtifacts) => {
    try {
        const artifacts = artifactsOverride || await loadArtifacts(userId, scenario);
        const foundationNote = artifacts.agentNotes.find((note: any) => note.id === `foundation-${sanitizeScenario(scenario)}`);
        const todosList = Array.isArray(artifacts.todos) ? artifacts.todos : [];
        const seatingList = Array.isArray(artifacts.seating) ? artifacts.seating : [];
        return `
        Scenario: ${sanitizeScenario(scenario)}
        Current Planner State:
        - Todos: ${todosList.map((t: any) => t.text).join(', ') || 'None yet'}
        - Budget Limit: $${artifacts.budget?.limit || 0}
        - Tables: ${seatingList.map((t: any) => `${t.name} (${t.guests.length}/${t.seats})`).join(', ') || 'None'}
        - Foundation Note: ${foundationNote?.content || 'Not captured yet'}
        `;
    } catch (e) {
        return "";
    }
};

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
        Return JSON ONLY:
        {
            "occasion": "string",
            "people": ["name or role", "..."],
            "needsGifts": boolean,
            "needsDinner": boolean,
            "needsSeating": boolean,
            "tone": "cozy / formal / party / family / other",
            "notes": "one or two short sentences",
            "priorities": ["short bullet priorities"]
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
            tone: 'festive',
            notes: 'Foundation details pending more info from the user.',
            priorities: []
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
    if (!hasFoundation) {
        updatedNotes.unshift({
            id: `foundation-${scenarioKey}`,
            title: `Foundation (${scenarioKey})`,
            type: 'text',
            content: foundationContent.substring(0, 5000)
        });
    }
    if (!hasProfile) {
        updatedNotes.unshift({
            id: `profile-${scenarioKey}`,
            title: `Profile (${scenarioKey})`,
            type: 'table',
            tableRows: profileRows
        });
    }

    const updatedArtifacts: SavedArtifacts = {
        ...current,
        agentNotes: updatedNotes.slice(0, 20) // respect validation limit
    };
    const key = `santas_elf:artifacts:${userId}:${scenarioKey}`;
    await redisClient.set(key, JSON.stringify(updatedArtifacts));
    return updatedArtifacts;
};

/**
 * POST /api/agent/chat
 * Main conversational endpoint for the AI Agent.
 * Supports optional image upload for multimodal interactions.
 */
router.post('/chat', upload.single('image'), async (req: Request, res: Response) => {
    const { prompt } = req.body;
    const file = req.file;
    // @ts-ignore
    const userId = req.user?.id;
    const scenario = sanitizeScenario((req.query.scenario as string) || (req.body?.scenario as string));
    let artifactsUpdatedFlag = false;
    let artifactsForScenario: SavedArtifacts | null = null;

    if (userId) {
        try {
            artifactsForScenario = await loadArtifacts(userId, scenario);
            if (prompt) {
                const beforeNotes = artifactsForScenario?.agentNotes?.length || 0;
                artifactsForScenario = await ensureFoundationNotes(userId, scenario, prompt, artifactsForScenario);
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

        // 1. Intent Recognition (Text Only)
        const contextInfo = userId ? await getArtifactsContext(userId, scenario, artifactsForScenario || undefined) : "";
        const lower = (prompt || '').toLowerCase();
        // Shortcut: if user explicitly asks for social sentiment
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
        
        const classificationPrompt = `
        You are Santa's Elf, a holiday assistant.
        Scenario: ${scenario}
        ${contextInfo}
        
        User says: "${prompt}"
        
        Determine the user's intent:
        - "recipe": if they want to find or cook food.
        - "gift": if they want gift ideas.
        - "decoration": if they want decoration advice (text-based only here).
        - "manage": if they want to add/remove tasks, update budget, or manage seating/guests.
        - "social": if they ask for what people are saying online (reddit/social sentiment).
        - "new_scenario": if they explicitly want to start planning a different event (e.g., "let's plan for Thanksgiving instead", "switch to birthday party").
        - "commerce": if they want to buy/order/checkout/pay (amazon, paypal, checkout links).
        - "chat": for general conversation or if you need more information to perform a "manage" action.
        If the request is missing foundation details (occasion, people involved, whether gifts/dinner/seating are needed), prefer "chat" with a short clarifying question to capture them.

        Return a JSON object with:
        {
            "intent": "recipe" | "gift" | "decoration" | "manage" | "chat" | "new_scenario",
            "toolQuery": "extracted search query for the tool OR JSON instruction for management OR scenario slug",
            "reply": "A friendly message to display before the result (optional)"
        }
        
        For "toolQuery":
        - If intent is recipe, extract the dish name.
        - If intent is gift, extract the description of the recipient/interests.
        - If intent is decoration, extract the room description.
        - If intent is new_scenario, extract a short, hyphenated slug for the new scenario name (e.g., "thanksgiving-dinner").
        - If intent is manage, provide a JSON string with action: "add_todo"|"remove_todo"|"set_budget"|"add_table"|"add_guest" and data. 
          Example: {"action": "add_todo", "data": "Buy milk"}
          Example: {"action": "add_table", "data": {"name": "Kids", "seats": 4}}
          Example: {"action": "add_guest", "data": {"guest": "Tim", "table": "Kids"}}
          
          IMPORTANT: If the user request for 'manage' is vague (e.g., "update budget" without a number), set intent to "chat" and ask for clarification in "reply".
        
        Return ONLY JSON.
        `;

        const text = await generateContent(classificationPrompt);
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        let parsed;
        try {
            parsed = JSON.parse(cleanedText);
        } catch (e) {
            parsed = { intent: 'chat', reply: text };
        }

        let data = null;
        let type = parsed.intent;
        let artifactsUpdated = artifactsUpdatedFlag;

        // 2. Tool Execution
        try {
            if (type === 'recipe') {
                data = await tools.find_recipe.function(parsed.toolQuery);
            } else if (type === 'gift') {
                data = await tools.find_gift.function(parsed.toolQuery);
            } else if (type === 'decoration') {
                data = await tools.get_decoration_suggestions.function(parsed.toolQuery);
            } else if (type === 'manage') {
                const result = await tools.manage_planner.function(parsed.toolQuery, { userId, scenario });
                if (result.success) {
                    parsed.reply = result.message;
                    data = result.artifacts; // Send back updated state if useful
                    artifactsUpdated = true;
                } else {
                    parsed.reply = result.message || "I couldn't update the planner.";
                }
            } else if (type === 'social') {
                data = await fetchSocialSuggestions(parsed.toolQuery || prompt || '');
            } else if (type === 'new_scenario') {
                // Special handling for switching scenarios
                return res.json({
                    type: 'switch_scenario',
                    message: parsed.reply || `Switching to ${parsed.toolQuery}...`,
                    data: parsed.toolQuery
                });
            }
        } catch (toolError) {
            console.error("Tool execution failed", toolError);
        }

        const aiResponse = parsed.type && parsed.message ? { ...parsed, artifactsUpdated } : {
            type,
            message: parsed.reply || "Here is what I found:",
            data,
            artifactsUpdated
        };

        if (userId) {
            const userMsg = { sender: 'user', text: prompt || (file ? "[Image Uploaded]" : ""), type: 'text' };
            const aiMsg = { sender: 'ai', text: aiResponse.message, type: aiResponse.type, data: aiResponse.data };
            await saveMessage(userId, scenario, userMsg);
            await saveMessage(userId, scenario, aiMsg);
        }

        return res.json(aiResponse);

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
