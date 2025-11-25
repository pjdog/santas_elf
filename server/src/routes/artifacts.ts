import { Router, Request, Response, NextFunction } from 'express';
import redisClient from '../config/db';
import { AgentNote, Preferences, AgentPlan, PlanStep } from '../models/types';
import { sanitizeScenario } from '../utils/scenario';
import { persistArtifactsToDisk } from '../utils/artifactFs';

const router = Router();

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Table {
    id: string;
    name: string;
    seats: number;
    guests: string[];
}

export interface Budget {
    limit: number;
    // 'current' is typically derived from gifts, but we can store a manual override or cached value if needed.
    // For now, let's calculate it on the fly or let the frontend calculate it.
    // We'll just store the limit.
}

export interface SavedArtifacts {
  todos: TodoItem[];
  recipes: any[]; 
  gifts: any[];
  decorations: string[];
  seating: Table[];
  budget: Budget;
  agentNotes: AgentNote[];
  features: string[];
  preferences: Preferences;
  plan: AgentPlan | null;
}

export const INITIAL_ARTIFACTS: SavedArtifacts = {
  todos: [],
  recipes: [],
  gifts: [],
  decorations: [],
  seating: [],
  budget: { limit: 0 },
  agentNotes: [],
  features: ['recipes', 'gifts', 'decorations'],
  preferences: {
      dietary: { allergies: [], dislikes: [], diets: [] },
      gifts: { recipientRelationship: "", recipientAge: null, recipientInterests: [], budgetMin: 0, budgetMax: 0, dislikes: [] },
      decorations: { room: "", style: "", preferredColors: [] }
  },
  plan: null
};

const rateLimit = async (req: Request, res: Response, next: NextFunction) => {
    // @ts-ignore
    const userId = req.user?.id;
    if (!userId) return next();

    const key = `ratelimit:artifacts:${userId}`;
    try {
        const current = await redisClient.incr(key);
        if (current === 1) {
            await redisClient.expire(key, 60);
        }
        if (current > 30) { // Increased limit slightly for agent interactions
            return res.status(429).json({ message: 'Too many updates. Please wait a moment.' });
        }
        next();
    } catch (e) {
        console.error('Rate limit error', e);
        next();
    }
};

const validateArtifacts = (data: any): { valid: boolean; cleaned?: SavedArtifacts } => {
    if (!data || typeof data !== 'object') return { valid: false };

    const todos: TodoItem[] = [];
    if (Array.isArray(data.todos)) {
        if (data.todos.length > 100) return { valid: false };
        for (const item of data.todos) {
            if (
                typeof item.id === 'string' && item.id.length < 50 &&
                typeof item.text === 'string' && item.text.length <= 500 &&
                typeof item.completed === 'boolean'
            ) {
                todos.push({ 
                    id: item.id, 
                    text: item.text.replace(/</g, "&lt;").replace(/>/g, "&gt;"),
                    completed: item.completed 
                });
            }
        }
    }

    const recipes: any[] = [];
    if (Array.isArray(data.recipes)) {
        if (data.recipes.length > 50) return { valid: false };
        for (const item of data.recipes) {
            if (item && typeof item === 'object' && item.name) {
                if (JSON.stringify(item).length < 10000) { // Increased limit for detailed recipes
                    recipes.push(item);
                }
            }
        }
    }

    const gifts: any[] = [];
    if (Array.isArray(data.gifts)) {
        if (data.gifts.length > 50) return { valid: false };
        for (const item of data.gifts) {
            if (item && typeof item === 'object' && item.name) {
                 if (JSON.stringify(item).length < 2000) {
                    gifts.push(item);
                }
            }
        }
    }

    const decorations: string[] = [];
    if (Array.isArray(data.decorations)) {
        if (data.decorations.length > 50) return { valid: false };
        for (const item of data.decorations) {
            if (typeof item === 'string' && item.length < 2000) {
                decorations.push(item.replace(/</g, "&lt;").replace(/>/g, "&gt;"));
            }
        }
    }

    const seating: Table[] = [];
    if (Array.isArray(data.seating)) {
        if (data.seating.length > 20) return { valid: false };
        for (const item of data.seating) {
            if (
                typeof item.id === 'string' && 
                typeof item.name === 'string' && 
                typeof item.seats === 'number' &&
                Array.isArray(item.guests)
            ) {
                // Sanitize guest names
                const guests = item.guests
                    .filter((g: any) => typeof g === 'string')
                    .map((g: string) => g.substring(0, 50).replace(/</g, "&lt;"));
                
                seating.push({
                    id: item.id,
                    name: item.name.substring(0, 50),
                    seats: Math.min(Math.max(item.seats, 1), 50),
                    guests
                });
            }
        }
    }

    let budget: Budget = { limit: 0 };
    if (data.budget && typeof data.budget.limit === 'number') {
        budget.limit = Math.max(0, data.budget.limit);
    }

    const agentNotes: AgentNote[] = [];
    if (Array.isArray(data.agentNotes)) {
        if (data.agentNotes.length > 20) return { valid: false }; // Max 20 notes
        for (const item of data.agentNotes) {
            if (
                typeof item.id === 'string' &&
                typeof item.title === 'string' &&
                (item.type === 'text' || item.type === 'table')
            ) {
                const note: AgentNote = {
                    id: item.id,
                    title: item.title.substring(0, 100).replace(/</g, "&lt;"),
                    type: item.type
                };

                if (item.type === 'text' && typeof item.content === 'string') {
                     note.content = item.content.substring(0, 5000).replace(/</g, "&lt;");
                }

                if (item.type === 'table' && Array.isArray(item.tableRows)) {
                    // Limit table size (e.g., 20x10)
                    const rows = item.tableRows.slice(0, 50);
                    note.tableRows = rows.map((row: any) => {
                        if (Array.isArray(row)) {
                            return row.slice(0, 10).map((cell: any) => 
                                typeof cell === 'string' ? cell.substring(0, 200).replace(/</g, "&lt;") : ""
                            );
                        }
                        return [];
                    });
                }
                agentNotes.push(note);
            }
        }
    }

    const features: string[] = [];
    if (Array.isArray(data.features)) {
        if (data.features.length > 10) return { valid: false };
        for (const item of data.features) {
            if (typeof item === 'string' && item.length < 50) {
                features.push(item.replace(/</g, "&lt;").replace(/>/g, "&gt;"));
            }
        }
    } else if (!data.features) {
        // Allow missing features field to pass validation and be defaulted later
    }

    // Preferences Validation
    const preferences: Preferences = JSON.parse(JSON.stringify(INITIAL_ARTIFACTS.preferences));
    if (data.preferences && typeof data.preferences === 'object') {
        const p = data.preferences;
        
        // Dietary
        if (p.dietary) {
            if (Array.isArray(p.dietary.allergies)) preferences.dietary.allergies = p.dietary.allergies.filter((s: any) => typeof s === 'string').slice(0, 20);
            if (Array.isArray(p.dietary.dislikes)) preferences.dietary.dislikes = p.dietary.dislikes.filter((s: any) => typeof s === 'string').slice(0, 20);
            if (Array.isArray(p.dietary.diets)) preferences.dietary.diets = p.dietary.diets.filter((s: any) => typeof s === 'string').slice(0, 10);
        }

        // Gifts
        if (p.gifts) {
            if (typeof p.gifts.recipientRelationship === 'string') preferences.gifts.recipientRelationship = p.gifts.recipientRelationship.substring(0, 50);
            if (typeof p.gifts.recipientAge === 'number' || p.gifts.recipientAge === null) preferences.gifts.recipientAge = p.gifts.recipientAge;
            if (Array.isArray(p.gifts.recipientInterests)) preferences.gifts.recipientInterests = p.gifts.recipientInterests.filter((s: any) => typeof s === 'string').slice(0, 20);
            if (typeof p.gifts.budgetMin === 'number') preferences.gifts.budgetMin = Math.max(0, p.gifts.budgetMin);
            if (typeof p.gifts.budgetMax === 'number') preferences.gifts.budgetMax = Math.max(0, p.gifts.budgetMax);
            if (Array.isArray(p.gifts.dislikes)) preferences.gifts.dislikes = p.gifts.dislikes.filter((s: any) => typeof s === 'string').slice(0, 20);
        }

        // Decorations
        if (p.decorations) {
            if (typeof p.decorations.room === 'string') preferences.decorations.room = p.decorations.room.substring(0, 50);
            if (typeof p.decorations.style === 'string') preferences.decorations.style = p.decorations.style.substring(0, 50);
            if (Array.isArray(p.decorations.preferredColors)) preferences.decorations.preferredColors = p.decorations.preferredColors.filter((s: any) => typeof s === 'string').slice(0, 10);
        }
    }

    // Plan Validation
    let plan: AgentPlan | null = null;
    if (data.plan && typeof data.plan === 'object') {
        const p = data.plan;
        if (typeof p.id === 'string' && typeof p.title === 'string' && Array.isArray(p.steps)) {
            const steps: PlanStep[] = [];
            for (const step of p.steps) {
                if (
                    typeof step.id === 'string' &&
                    typeof step.description === 'string' &&
                    ['pending', 'in_progress', 'completed', 'cancelled'].includes(step.status)
                ) {
                    steps.push({
                        id: step.id.substring(0, 50),
                        description: step.description.substring(0, 200).replace(/</g, "&lt;"),
                        status: step.status
                    });
                }
            }
            // Only accept valid plans
            if (steps.length > 0 || p.steps.length === 0) {
                plan = {
                    id: p.id.substring(0, 50),
                    title: p.title.substring(0, 100).replace(/</g, "&lt;"),
                    steps: steps.slice(0, 20) // Max 20 steps
                };
            }
        }
    }


    return { 
        valid: true, 
        cleaned: { 
            todos, recipes, gifts, decorations, seating, budget, agentNotes,
            features: features.length > 0 ? features : (data.features ? [] : ['recipes', 'gifts', 'decorations']),
            preferences,
            plan
        } 
    };
};

router.get('/', async (req, res) => {
  // @ts-ignore
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const scenario = sanitizeScenario(req.query.scenario as string);

  try {
    const data = await redisClient.get(`santas_elf:artifacts:${userId}:${scenario}`);
    const artifacts = data ? JSON.parse(data) : INITIAL_ARTIFACTS;
    
    // Migration/Backfill for new fields
    if (!artifacts.seating) artifacts.seating = [];
    if (!artifacts.budget) artifacts.budget = { limit: 0 };
    if (!artifacts.decorations) artifacts.decorations = []; // Ensure migration from prev step too
    if (!artifacts.agentNotes) artifacts.agentNotes = [];
    if (!artifacts.features) artifacts.features = ['recipes', 'gifts', 'decorations'];
    if (!artifacts.preferences) artifacts.preferences = JSON.parse(JSON.stringify(INITIAL_ARTIFACTS.preferences));

    res.json(artifacts);
  } catch (error) {
    console.error('Error fetching artifacts:', error);
    res.status(500).json({ message: 'Failed to fetch artifacts' });
  }
});

router.post('/', rateLimit, async (req, res) => {
  // @ts-ignore
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const scenario = sanitizeScenario(req.query.scenario as string);

  const { valid, cleaned } = validateArtifacts(req.body);

  if (!valid || !cleaned) {
      return res.status(400).json({ message: 'Invalid data format or size limits exceeded.' });
  }

  try {
    await redisClient.set(`santas_elf:artifacts:${userId}:${scenario}`, JSON.stringify(cleaned));
    // Best-effort export to disk for CLI/debugging; scenario drives folder name
    persistArtifactsToDisk(userId, scenario, cleaned);
    res.json(cleaned);
  } catch (error) {
    console.error('Error saving artifacts:', error);
    res.status(500).json({ message: 'Failed to save artifacts' });
  }
});

router.delete('/', async (req, res) => {
    // @ts-ignore
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const scenario = sanitizeScenario(req.query.scenario as string);

    // Default scenario cannot be deleted via this endpoint for safety, or maybe it can?
    // The user request implies removing scenarios. Let's allow it but maybe warn or just do it.
    // The tool `delete_scenario` allows deleting 'default' if confirmed. We will allow it here too.

    try {
        const artifactKey = `santas_elf:artifacts:${userId}:${scenario}`;
        const chatKey = `chat:${userId}:${scenario}`;

        await redisClient.del(artifactKey);
        await redisClient.del(chatKey);
        
        // We should also probably remove it from any list of scenarios if we tracked that, 
        // but currently scenarios are implicit.

        res.json({ message: `Scenario '${scenario}' deleted successfully.` });
    } catch (error) {
        console.error('Error deleting scenario:', error);
        res.status(500).json({ message: 'Failed to delete scenario' });
    }
});

export default router;
