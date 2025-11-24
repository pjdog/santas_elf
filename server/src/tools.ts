import axios from 'axios';
import redisClient from './config/db';
import { generateContent } from './utils/llm';

export const tools: Record<string, { description: string, function: (input: string) => Promise<any> }> = {
  find_recipe: {
    description: "Searches for recipes based on a query, prioritizing sources like NYT Cooking and America's Test Kitchen.",
    function: async (query: string) => {
      const normalizeMealDBRecipe = (meal: any) => {
        const ingredients = [];
        for (let i = 1; i <= 20; i++) {
            const item = meal[`strIngredient${i}`];
            const quantityRaw = meal[`strMeasure${i}`];
            if (item && item.trim()) {
                 let quantity = 0;
                 let unit = '';
                 if (quantityRaw) {
                    const match = quantityRaw.match(/([\d.]+)\s*(.*)/);
                    if (match) {
                        quantity = parseFloat(match[1]) || 0;
                        unit = match[2] || '';
                    } else {
                        unit = quantityRaw;
                    }
                 }
                 ingredients.push({ item: item.trim(), quantity, unit });
            }
        }
        return {
            name: meal.strMeal,
            description: `Category: ${meal.strCategory}, Area: ${meal.strArea}.`,
            ingredients,
            instructions: meal.strInstructions ? meal.strInstructions.split(/\r\n|\n/).filter((i: string) => i.trim()) : [],
            servings: 4, // Default
            prepTime: 'Unknown',
            cookTime: 'Unknown'
        };
      };

      try {
        const prompt = `Find or generate a recipe for "${query}". 
        Prioritize styles or well-known recipes from sources like NYT Cooking, America's Test Kitchen, or Bon Appétit.
        Provide the recipe name, a brief description, a list of ingredients (with quantities), and step-by-step instructions.
        Format the output as a valid JSON object with the following structure:
        {
          "name": "Recipe Name",
          "description": "Brief description...",
          "ingredients": [
            {"item": "ingredient name", "quantity": 1, "unit": "unit"}
          ],
          "instructions": ["Step 1", "Step 2"],
          "servings": 4,
          "prepTime": "10 min",
          "cookTime": "20 min"
        }
        Return ONLY the JSON object.`;
        
        const text = await generateContent(prompt);
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedText);
      } catch (error: any) {
        console.error("Error generating recipe:", error);
        // Fallback to TheMealDB if LLM fails
        try {
            const response = await axios.get(`https://www.themealdb.com/api/json/v1/1/search.php?s=${query}`);
            if (response.data.meals && response.data.meals.length > 0) {
                return normalizeMealDBRecipe(response.data.meals[0]);
            }
            return null;
        } catch (e) {
            console.error("Fallback error:", e);
            return null;
        }
      }
    },
  },
  find_gift: {
    description: "Provides gift ideas based on a description, aggregating wisdom from Wirecutter, Reddit, and NYT.",
    function: async (query: string) => {
      try {
        const prompt = `Suggest 3 unique and thoughtful gift ideas for someone who matches this description: "${query}". 
        Draw inspiration from reputable review sites like The Wirecutter, New York Times, and Reddit communities (e.g., r/BuyItForLife, r/giftideas).
        
        Format the output as a valid JSON array of objects with the following structure:
        [
          {
            "name": "Gift Name",
            "description": "Brief description and why it is recommended...",
            "budget": { "min": 50, "max": 100 }
          }
        ]
        Return ONLY the JSON array.`;
        const text = await generateContent(prompt);
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedText);
      } catch (error: any) {
        console.error("Error generating gift ideas:", error);
        return [];
      }
    },
  },
  get_decoration_suggestions: {
    description: "Provides decoration suggestions for a room based on an image description or context.",
    function: async (query: string) => {
       try {
        const prompt = `Suggest 3 festive decoration themes for a room described as: "${query}". List specific items for each theme.`;
        const text = await generateContent(prompt);
        return text;
      } catch (error: any) {
        console.error("Error generating decoration suggestions:", error);
        return `I couldn't generate decoration suggestions at the moment. ${error.message}`;
      }
    },
  },
};