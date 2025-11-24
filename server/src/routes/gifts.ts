import { Router, Request, Response } from 'express';
import redisClient from '../config/db';
import { Gift } from '../models/types';
import { tools } from '../tools';

const router = Router();

type LegacyGiftPayload = Gift & {
  budget_min?: number;
  budget_max?: number;
};

const parseGift = (payload?: string): Gift | null => {
  if (!payload) {
    return null;
  }

  try {
    const parsed = JSON.parse(payload) as LegacyGiftPayload;
    if (!parsed.budget && parsed.budget_min !== undefined && parsed.budget_max !== undefined) {
      parsed.budget = {
        min: parsed.budget_min,
        max: parsed.budget_max,
      };
    }

    return parsed;
  } catch (error) {
    console.error('Failed to parse gift payload', error);
    return null;
  }
};

router.get('/', async (req: Request, res: Response) => {
  try {
    const recipientParam = typeof req.query.recipient === 'string' ? req.query.recipient : undefined;
    const interestsParam = typeof req.query.interests === 'string' ? req.query.interests : undefined;
    const budgetMinParam = typeof req.query.budgetMin === 'string' ? parseFloat(req.query.budgetMin) : undefined;
    const budgetMaxParam = typeof req.query.budgetMax === 'string' ? parseFloat(req.query.budgetMax) : undefined;

    // If search parameters are present, use the LLM tool
    if (recipientParam || interestsParam) {
        const queryParts = [];
        if (recipientParam) queryParts.push(`recipient: ${recipientParam}`);
        if (interestsParam) queryParts.push(`interests: ${interestsParam}`);
        if (budgetMinParam !== undefined || budgetMaxParam !== undefined) {
            queryParts.push(`budget: $${budgetMinParam || 0} - $${budgetMaxParam || 'any'}`);
        }
        const query = queryParts.join(', ');

        try {
            const result = await tools.find_gift.function(query);
            
            if (Array.isArray(result)) {
                const generatedGifts: Gift[] = result.map((item: any, index: number) => ({
                    id: `gen-${Date.now()}-${index}`,
                    name: item.name,
                    description: item.description,
                    recipient: recipientParam ? [recipientParam] : [],
                    interests: interestsParam ? interestsParam.split(',').map(s => s.trim()) : [],
                    budget: item.budget || { min: 0, max: 0 },
                    link: `https://www.google.com/search?q=${encodeURIComponent(item.name)}`
                }));
                
                // Filter by budget if the LLM didn't strictly adhere (optional, but good practice)
                let filteredGifts = generatedGifts;
                if (typeof budgetMinParam === 'number' && budgetMinParam >= 0) {
                    filteredGifts = filteredGifts.filter((gift) => gift.budget.max >= budgetMinParam);
                }
                if (typeof budgetMaxParam === 'number' && budgetMaxParam >= 0) {
                    filteredGifts = filteredGifts.filter((gift) => gift.budget.min <= budgetMaxParam);
                }

                res.json(filteredGifts);
                return;
            }
        } catch (err) {
            console.error("Error using find_gift tool:", err);
            // Fallback to Redis if tool fails
        }
    }

    // Existing Redis logic
    const giftKeys = await redisClient.sMembers('gifts');
    let gifts: Gift[] = [];

    for (const key of giftKeys) {
      const giftData = await redisClient.hGetAll(key);
      const parsedGift = parseGift(giftData.data);
      if (parsedGift) {
        gifts.push(parsedGift);
      }
    }

    if (recipientParam) {
      const recipients = recipientParam
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);

      if (recipients.length > 0) {
        gifts = gifts.filter((gift) => {
          const giftRecipients = (gift.recipient ?? []).map((value) => value.toLowerCase());
          return recipients.some((recipient) => giftRecipients.includes(recipient));
        });
      }
    }

    if (interestsParam) {
      const interests = interestsParam
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);

      if (interests.length > 0) {
        gifts = gifts.filter((gift) => {
          const giftInterests = (gift.interests ?? []).map((value) => value.toLowerCase());
          return interests.some((interest) => giftInterests.includes(interest));
        });
      }
    }

    if (typeof budgetMinParam === 'number' && budgetMinParam >= 0) {
      gifts = gifts.filter((gift) => gift.budget.max >= budgetMinParam);
    }

    if (typeof budgetMaxParam === 'number' && budgetMaxParam >= 0) {
      gifts = gifts.filter((gift) => gift.budget.min <= budgetMaxParam);
    }

    res.json(gifts);
  } catch (error) {
    console.error('Error fetching gifts:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const giftData = await redisClient.hGetAll(`gift:${id}`);
    const gift = parseGift(giftData.data);

    if (gift) {
      res.json(gift);
      return;
    }

    res.status(404).json({ message: 'Gift not found' });
  } catch (error) {
    console.error('Error fetching gift by ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
