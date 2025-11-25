import axios from 'axios';
import redisClient from './config/db';
import { generateContent } from './utils/llm';
import { SavedArtifacts, INITIAL_ARTIFACTS } from './routes/artifacts';
import { sanitizeScenario } from './utils/scenario';

/**
 * Helper to fetch current artifacts for a user
 */
const getArtifacts = async (userId: string, scenario = 'default'): Promise<SavedArtifacts> => {
    const data = await redisClient.get(`santas_elf:artifacts:${userId}:${sanitizeScenario(scenario)}`);
    const artifacts = data ? JSON.parse(data) : INITIAL_ARTIFACTS;
    // Ensure structure integrity for new fields if fetching old data
    if (!artifacts.seating) artifacts.seating = [];
    if (!artifacts.budget) artifacts.budget = { limit: 0 };
    if (!artifacts.decorations) artifacts.decorations = [];
    if (!artifacts.agentNotes) artifacts.agentNotes = [];
    return artifacts;
};

/**
 * Helper to save artifacts for a user
 */
const saveArtifacts = async (userId: string, scenario: string, data: SavedArtifacts) => {
    const key = `santas_elf:artifacts:${userId}:${sanitizeScenario(scenario)}`;
    await redisClient.set(key, JSON.stringify(data));
};

/**
 * Tool Registry
 * Note: 'function' now accepts an optional second argument `context` containing userId.
 */
export const tools: Record<string, { description: string, function: (input: string, context?: { userId: string, scenario?: string }) => Promise<any> }> = {
  find_recipe: {
    description: "Searches for recipes based on a query.",
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
    description: "Provides gift ideas.",
    function: async (query: string) => {
      try {
        const prompt = `Suggest 3 unique gift ideas for: "${query}". 
        Format the output as a valid JSON array of objects:
        [
          {
            "name": "Gift Name",
            "description": "Brief description...",
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
    description: "Provides decoration suggestions.",
    function: async (query: string) => {
       try {
        const prompt = `Suggest 3 festive decoration themes for: "${query}". List specific items.`;
        const text = await generateContent(prompt);
        return text;
      } catch (error: any) {
        return `I couldn't generate decoration suggestions. ${error.message}`;
      }
    },
  },
  // --- Internal Management Tools ---
  manage_planner: {
      description: "Adds, removes, or updates items in the user's planner (tasks, budget, seating). Input should be a JSON string instruction.",
      function: async (input: string, context?: { userId: string, scenario?: string }) => {
          if (!context?.userId) return { success: false, message: "Error: No user context." };
          const scenario = sanitizeScenario(context.scenario || 'default');
          
          try {
              let instruction;
              try {
                  instruction = JSON.parse(input);
              } catch (e) {
                  // Try to handle non-JSON input gracefully if possible, or return error
                  return { success: false, message: "Error: Invalid instruction format. Expected JSON." };
              }

              const artifacts = await getArtifacts(context.userId, scenario);
              let message = "Done.";

              switch (instruction.action) {
                  case 'add_todo':
                      artifacts.todos.push({ id: Date.now().toString(), text: instruction.data, completed: false });
                      message = `Added task: ${instruction.data}`;
                      break;
                  case 'remove_todo':
                      const initialCount = artifacts.todos.length;
                      artifacts.todos = artifacts.todos.filter(t => !t.text.toLowerCase().includes(instruction.data.toLowerCase()));
                      if (artifacts.todos.length < initialCount) message = `Removed task matching: ${instruction.data}`;
                      else message = `Could not find task matching: ${instruction.data}`;
                      break;
                  case 'set_budget':
                      artifacts.budget = { limit: Number(instruction.data) };
                      message = `Budget limit set to $${instruction.data}`;
                      break;
                  case 'add_table':
                      artifacts.seating.push({
                          id: Date.now().toString(), 
                          name: instruction.data.name, 
                          seats: instruction.data.seats, 
                          guests: [] 
                      });
                      message = `Added table: ${instruction.data.name}`;
                      break;
                  case 'add_guest':
                      const guestName = instruction.data.guest;
                      const tableName = instruction.data.table;
                      
                      if (tableName) {
                          const table = artifacts.seating.find(t => t.name.toLowerCase().includes(tableName.toLowerCase()));
                          if (table) {
                              if (table.guests.length < table.seats) {
                                  table.guests.push(guestName);
                                  message = `Added ${guestName} to ${table.name}`;
                              } else {
                                  message = `${table.name} is full.`;
                              }
                          } else {
                              message = `Table ${tableName} not found.`;
                          }
                      } else {
                          message = "Please specify a table name.";
                      }
                      break;
                  default:
                      return { 
                          success: false, 
                          message: `I'm not sure how to do that. Valid actions are: add_todo, remove_todo, set_budget, add_table, add_guest.` 
                      };
              }

              await saveArtifacts(context.userId, scenario, artifacts);
              return { success: true, message, artifacts }; 
          } catch (e: any) {
              console.error("Manage planner error", e);
              return { success: false, message: "Failed to update planner." };
          }
      }
  }
};

/**
 * Helper to build safe external commerce suggestions without performing purchases.
 */
const buildCommerceSuggestions = (query: string) => {
    const safeQuery = encodeURIComponent(query || 'holiday gifts');
    return {
        summary: 'Checkout helpers (no purchases made)',
        amazonSearch: `https://www.amazon.com/s?k=${safeQuery}`,
        paypalQuickInvoice: 'Create a PayPal payment request with title/amount and share the link.',
        checklist: [
            'Confirm item, quantity, and delivery date before purchasing.',
            'Use saved addresses and payment methods where possible.',
            'Review return policy for each merchant.'
        ]
    };
};

tools['commerce_checkout'] = {
    description: "Suggests safe checkout entry points (Amazon search, PayPal invoice guidance).",
    function: async (query: string) => {
        return buildCommerceSuggestions(query);
    }
};
