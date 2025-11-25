import axios from 'axios';
import redisClient from './config/db';
import { generateContent } from './utils/llm';
import { SavedArtifacts, INITIAL_ARTIFACTS } from './routes/artifacts';
import { sanitizeScenario } from './utils/scenario';
import { persistArtifactsToDisk } from './utils/artifactFs';
import { fetchProductDeals } from './utils/social';

/**
 * Retrieves the user's artifacts (planner data) from Redis.
 * Initializes default structure if no data exists.
 * 
 * @param userId - The unique identifier of the user.
 * @param scenario - The scenario slug (default: 'default').
 * @returns A promise resolving to the user's SavedArtifacts.
 */
const getArtifacts = async (userId: string, scenario = 'default'): Promise<SavedArtifacts> => {
    const data = await redisClient.get(`santas_elf:artifacts:${userId}:${sanitizeScenario(scenario)}`);
    const artifacts = data ? JSON.parse(data) : INITIAL_ARTIFACTS;
    // Ensure structure integrity for new fields if fetching old data
    if (!artifacts.seating) artifacts.seating = [];
    if (!artifacts.budget) artifacts.budget = { limit: 0 };
    if (!artifacts.decorations) artifacts.decorations = [];
    if (!artifacts.agentNotes) artifacts.agentNotes = [];
    if (!artifacts.preferences) artifacts.preferences = {
        dietary: { allergies: [], dislikes: [], diets: [] },
        gifts: { recipientRelationship: "", recipientAge: null, recipientInterests: [], budgetMin: 0, budgetMax: 0, dislikes: [] },
        decorations: { room: "", style: "", preferredColors: [] }
    };
    return artifacts;
};

/**
 * Saves the user's artifacts to Redis and persists a copy to disk.
 * 
 * @param userId - The unique identifier of the user.
 * @param scenario - The scenario slug.
 * @param data - The artifacts object to save.
 */
const saveArtifacts = async (userId: string, scenario: string, data: SavedArtifacts) => {
    const key = `santas_elf:artifacts:${userId}:${sanitizeScenario(scenario)}`;
    await redisClient.set(key, JSON.stringify(data));
    persistArtifactsToDisk(userId, scenario, data);
};

/**
 * Tool Registry.
 * Defines the capabilities available to the LLM Agent.
 * Each tool maps a function description to an executable function.
 */
export const tools: Record<string, { description: string, function: (input: string, context?: { userId: string, scenario?: string }) => Promise<any> }> = {
  find_recipe: {
    description: "Searches for recipes based on a query.",
    function: async (query: string, context?: { userId: string, scenario?: string }) => {
      let preferencesPrompt = "";
      if (context?.userId) {
          const artifacts = await getArtifacts(context.userId, context.scenario);
          const dietary = artifacts.preferences?.dietary;
          if (dietary) {
              const allergies = dietary.allergies.join(', ');
              const dislikes = dietary.dislikes.join(', ');
              const diets = dietary.diets.join(', ');
              if (allergies) preferencesPrompt += `\nCRITICAL: Exclude ingredients causing allergies: ${allergies}.`;
              if (dislikes) preferencesPrompt += `\nAvoid ingredients: ${dislikes}.`;
              if (diets) preferencesPrompt += `\nAdhere to diets: ${diets}.`;
          }
      }

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
        Prioritize styles or well-known recipes from sources like NYT Cooking, America's Test Kitchen, Bon Appétit, and Food & Wine (trending, modern spins are great).
        ${preferencesPrompt}
        If the query mentions allergies or dislikes, avoid those ingredients and note the avoidance in the description.
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
    function: async (query: string, context?: { userId: string, scenario?: string }) => {
      let preferencesPrompt = "";
      if (context?.userId) {
          const artifacts = await getArtifacts(context.userId, context.scenario);
          const gifts = artifacts.preferences?.gifts;
          if (gifts) {
              if (gifts.recipientInterests.length > 0) preferencesPrompt += `\nRecipient interests: ${gifts.recipientInterests.join(', ')}.`;
              if (gifts.recipientRelationship) preferencesPrompt += `\nRelationship: ${gifts.recipientRelationship}.`;
              if (gifts.budgetMin > 0 || gifts.budgetMax > 0) preferencesPrompt += `\nBudget range: $${gifts.budgetMin} - $${gifts.budgetMax}.`;
              if (gifts.dislikes.length > 0) preferencesPrompt += `\nAvoid gifts related to: ${gifts.dislikes.join(', ')}.`;
          }
      }

      try {
        const prompt = `Suggest 3 unique gift ideas for: "${query}". 
        ${preferencesPrompt}
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
    function: async (query: string, context?: { userId: string, scenario?: string }) => {
       let preferencesPrompt = "";
       if (context?.userId) {
           const artifacts = await getArtifacts(context.userId, context.scenario);
           const decorations = artifacts.preferences?.decorations;
           if (decorations) {
               if (decorations.style) preferencesPrompt += `\nPreferred Style: ${decorations.style}.`;
               if (decorations.preferredColors.length > 0) preferencesPrompt += `\nColor Palette: ${decorations.preferredColors.join(', ')}.`;
               if (decorations.room) preferencesPrompt += `\nFocus Room: ${decorations.room}.`;
           }
       }

       try {
        const prompt = `Suggest 3 festive decoration themes for: "${query}". 
        ${preferencesPrompt}
        List specific items.`;
        const text = await generateContent(prompt);
        return text;
      } catch (error: any) {
        return `I couldn't generate decoration suggestions. ${error.message}`;
      }
    },
  },
  // --- Internal Management Tools ---
  manage_planner: {
      description: "Adds, removes, or updates items in the user's planner (tasks, budget, seating). Input should be a JSON string with 'action' and 'data'. Valid actions: add_todo, remove_todo, set_budget, add_table, add_guest, set_features, set_preferences. Example: { \"action\": \"add_todo\", \"data\": \"Buy milk\" } or { \"action\": \"set_budget\", \"data\": 500 }.",
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
                  case 'set_features':
                      if (Array.isArray(instruction.data)) {
                          artifacts.features = instruction.data;
                          message = `Updated planner features: ${instruction.data.join(', ')}`;
                      } else {
                          message = "Error: Features must be a list.";
                      }
                      break;
                  case 'set_preferences':
                      // Expect data to be a partial Preferences object
                      if (typeof instruction.data === 'object') {
                          const newPrefs = instruction.data;
                          if (!artifacts.preferences) artifacts.preferences = INITIAL_ARTIFACTS.preferences;
                          
                          // Deep merge logic (simplified)
                          if (newPrefs.dietary) {
                              if (newPrefs.dietary.allergies) artifacts.preferences.dietary.allergies = [...new Set([...artifacts.preferences.dietary.allergies, ...newPrefs.dietary.allergies])];
                              if (newPrefs.dietary.dislikes) artifacts.preferences.dietary.dislikes = [...new Set([...artifacts.preferences.dietary.dislikes, ...newPrefs.dietary.dislikes])];
                              if (newPrefs.dietary.diets) artifacts.preferences.dietary.diets = [...new Set([...artifacts.preferences.dietary.diets, ...newPrefs.dietary.diets])];
                          }
                          if (newPrefs.gifts) {
                              if (newPrefs.gifts.recipientRelationship) artifacts.preferences.gifts.recipientRelationship = newPrefs.gifts.recipientRelationship;
                              if (newPrefs.gifts.recipientAge) artifacts.preferences.gifts.recipientAge = newPrefs.gifts.recipientAge;
                              if (newPrefs.gifts.recipientInterests) artifacts.preferences.gifts.recipientInterests = [...new Set([...artifacts.preferences.gifts.recipientInterests, ...newPrefs.gifts.recipientInterests])];
                              if (newPrefs.gifts.budgetMin) artifacts.preferences.gifts.budgetMin = newPrefs.gifts.budgetMin;
                              if (newPrefs.gifts.budgetMax) artifacts.preferences.gifts.budgetMax = newPrefs.gifts.budgetMax;
                              if (newPrefs.gifts.dislikes) artifacts.preferences.gifts.dislikes = [...new Set([...artifacts.preferences.gifts.dislikes, ...newPrefs.gifts.dislikes])];
                          }
                          if (newPrefs.decorations) {
                              if (newPrefs.decorations.room) artifacts.preferences.decorations.room = newPrefs.decorations.room;
                              if (newPrefs.decorations.style) artifacts.preferences.decorations.style = newPrefs.decorations.style;
                              if (newPrefs.decorations.preferredColors) artifacts.preferences.decorations.preferredColors = [...new Set([...artifacts.preferences.decorations.preferredColors, ...newPrefs.decorations.preferredColors])];
                          }
                          message = "Updated preferences.";
                      } else {
                          message = "Error: Invalid preference data.";
                      }
                      break;
                  default:
                      return { 
                          success: false, 
                          message: `I'm not sure how to do that. Valid actions are: add_todo, remove_todo, set_budget, add_table, add_guest, set_features, set_preferences.` 
                      };
              }

              await saveArtifacts(context.userId, scenario, artifacts);
              return { success: true, message, artifacts }; 
          } catch (e: any) {
              console.error("Manage planner error", e);
              return { success: false, message: "Failed to update planner." };
          }
      }
  },
  manage_plan: {
      description: "Creates or updates the agent's high-level plan. Input should be a JSON string with 'action' and 'data'. Valid actions: 'create_plan' (data: { title: string, steps: string[] }) or 'update_step' (data: { stepId: string, status: string }). Example: { \"action\": \"create_plan\", \"data\": { \"title\": \"Party\", \"steps\": [\"Step 1\"] } }.",
      function: async (input: string, context?: { userId: string, scenario?: string }) => {
          if (!context?.userId) return { success: false, message: "Error: No user context." };
          const scenario = sanitizeScenario(context.scenario || 'default');
          
          try {
              let instruction;
              try {
                  instruction = JSON.parse(input);
              } catch (e) {
                  return { success: false, message: "Error: Invalid instruction format. Expected JSON." };
              }

              const artifacts = await getArtifacts(context.userId, scenario);
              let message = "Plan updated.";

              // Actions: create_plan, update_step
              if (instruction.action === 'create_plan') {
                  // Expect data to have title and steps (array of strings)
                  const steps = Array.isArray(instruction.data.steps) ? instruction.data.steps : [];
                  artifacts.plan = {
                      id: Date.now().toString(),
                      title: instruction.data.title || "Holiday Plan",
                      steps: steps.map((desc: string, idx: number) => ({
                          id: `step-${idx + 1}`,
                          description: desc,
                          status: 'pending'
                      }))
                  };
                  message = "Created new plan.";
              } else if (instruction.action === 'update_step') {
                  if (!artifacts.plan) return { success: false, message: "No plan exists to update." };
                  // Expect data: { stepId: string, status: string }
                  const step = artifacts.plan.steps.find(s => s.id === instruction.data.stepId);
                  if (step) {
                      if (['pending', 'in_progress', 'completed', 'cancelled'].includes(instruction.data.status)) {
                          step.status = instruction.data.status;
                          message = `Updated step ${step.id} to ${step.status}.`;
                      }
                  } else {
                      message = "Step not found.";
                  }
              } else {
                  return { success: false, message: "Invalid plan action." };
              }

              await saveArtifacts(context.userId, scenario, artifacts);
              return { success: true, message, artifacts };
          } catch (e: any) {
              console.error("Manage plan error", e);
              return { success: false, message: "Failed to update plan." };
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

tools['find_product_insights'] = {
    description: "Searches for shopping deals, price discussions, and coupons for a product. Returns recent posts from deal communities (like Reddit deals/coupons). Input: Product name.",
    function: async (query: string) => {
        const deals = await fetchProductDeals(query);
        return {
            message: `Found ${deals.length} discussions about deals for "${query}".`,
            deals
        };
    }
};

tools['delete_scenario'] = {
    description: "Deletes the current scenario's plan, artifacts, and chat history. CAUTION: This action is irreversible. Input: 'confirm' to proceed.",
    function: async (input: string, context?: { userId: string, scenario?: string }) => {
        if (!context?.userId) return { success: false, message: "Error: No user context." };
        const scenario = sanitizeScenario(context.scenario || 'default');

        if (input.toLowerCase().trim() !== 'confirm') {
            return { success: false, message: "Deletion cancelled. You must provide the input 'confirm' to delete the scenario." };
        }

        try {
            const artifactKey = `santas_elf:artifacts:${context.userId}:${scenario}`;
            const chatKey = `chat:${context.userId}:${scenario}`;

            await redisClient.del(artifactKey);
            await redisClient.del(chatKey);
            
            // We don't delete the persisted file on disk for safety/audit reasons in this tool, 
            // but we could if required. Redis is the source of truth for the app.

            return { 
                success: true, 
                message: `Scenario '${scenario}' has been deleted. Artifacts and chat history are cleared.`,
                artifacts: INITIAL_ARTIFACTS // Return empty artifacts to reset UI
            };
        } catch (e: any) {
            console.error("Delete scenario error", e);
            return { success: false, message: "Failed to delete scenario." };
        }
    }
};

export const toolDefinitions = Object.entries(tools).map(([name, tool]) => ({
    name,
    description: tool.description
}));
