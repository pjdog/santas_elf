import { Router, Request, Response, NextFunction } from 'express';
import redisClient from '../config/db';

const router = Router();

// Types for our artifacts
interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

interface SavedArtifacts {
  todos: TodoItem[];
  recipes: any[]; // Using loose type for now to store full recipe objects
  gifts: any[];
}

const INITIAL_ARTIFACTS: SavedArtifacts = {
  todos: [],
  recipes: [],
  gifts: []
};

// --- Security & Validation Helpers ---

// 1. Rate Limiting Middleware (Redis-based)
// Allows 20 write requests per minute per user
const rateLimit = async (req: Request, res: Response, next: NextFunction) => {
    // @ts-ignore
    const userId = req.user?.id;
    if (!userId) return next(); // Auth middleware handles this, but safety first

    const key = `ratelimit:artifacts:${userId}`;
    try {
        const current = await redisClient.incr(key);
        if (current === 1) {
            await redisClient.expire(key, 60); // 1 minute window
        }
        if (current > 20) {
            return res.status(429).json({ message: 'Too many updates. Please wait a moment.' });
        }
        next();
    } catch (e) {
        console.error('Rate limit error', e);
        next(); // Fail open if redis issues, or fail closed? Fail open for UX.
    }
};

// 2. Input Validation
const validateArtifacts = (data: any): { valid: boolean; cleaned?: SavedArtifacts } => {
    if (!data || typeof data !== 'object') return { valid: false };

    // Validate Todos
    const todos: TodoItem[] = [];
    if (Array.isArray(data.todos)) {
        if (data.todos.length > 100) return { valid: false }; // Limit count
        for (const item of data.todos) {
            if (
                typeof item.id === 'string' && item.id.length < 50 &&
                typeof item.text === 'string' && item.text.length <= 500 && // Max text length
                typeof item.completed === 'boolean'
            ) {
                todos.push({ 
                    id: item.id, 
                    text: item.text.replace(/</g, "&lt;").replace(/>/g, "&gt;"), // Basic sanitization
                    completed: item.completed 
                });
            }
        }
    }

    // Validate Recipes (Basic structure check)
    const recipes: any[] = [];
    if (Array.isArray(data.recipes)) {
        if (data.recipes.length > 50) return { valid: false };
        for (const item of data.recipes) {
            if (item && typeof item === 'object' && item.name) {
                // Allow pass-through but limit size
                if (JSON.stringify(item).length < 5000) {
                    recipes.push(item);
                }
            }
        }
    }

    // Validate Gifts
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

    return { 
        valid: true, 
        cleaned: { todos, recipes, gifts } 
    };
};

// --- Routes ---

// Get all artifacts for the user
router.get('/', async (req, res) => {
  // @ts-ignore
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    // Use namespaced key to prevent collisions
    const data = await redisClient.get(`santas_elf:artifacts:${userId}`);
    const artifacts = data ? JSON.parse(data) : INITIAL_ARTIFACTS;
    res.json(artifacts);
  } catch (error) {
    console.error('Error fetching artifacts:', error);
    res.status(500).json({ message: 'Failed to fetch artifacts' });
  }
});

// Save/Update artifacts
router.post('/', rateLimit, async (req, res) => {
  // @ts-ignore
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const { valid, cleaned } = validateArtifacts(req.body);

  if (!valid || !cleaned) {
      return res.status(400).json({ message: 'Invalid data format or size limits exceeded.' });
  }

  try {
    await redisClient.set(`santas_elf:artifacts:${userId}`, JSON.stringify(cleaned));
    res.json(cleaned);
  } catch (error) {
    console.error('Error saving artifacts:', error);
    res.status(500).json({ message: 'Failed to save artifacts' });
  }
});

export default router;