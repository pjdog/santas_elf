import { Router } from 'express';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import redisClient from '../config/db';
import { isAuthenticated } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/suggestions', isAuthenticated, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image file uploaded.' });
  }

  try {
    const settings = await redisClient.hGetAll('llm:settings');
    if (!settings.apiKey || !settings.model) {
      return res.status(400).json({ message: 'LLM not configured. Please set up the LLM in the settings.' });
    }

    const genAI = new GoogleGenerativeAI(settings.apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });

    const prompt = "Given this image of a room, suggest three different Christmas decoration themes and list specific items for each theme.";
    
    const imagePart = {
        inlineData: {
          data: req.file.buffer.toString("base64"),
          mimeType: req.file.mimetype,
        },
      };

    const result = await model.generateContent([prompt, imagePart]);
    const response = result.response;
    const text = response.text();

    res.json({ suggestions: text });
  } catch (error) {
    console.error('Error getting decoration suggestions:', error);
    res.status(500).json({ message: 'Error getting decoration suggestions.' });
  }
});

export default router;
