/**
 * Represents a single ingredient in a recipe.
 */
export interface Ingredient {
  /** The name of the ingredient (e.g., "Sugar"). */
  item: string;
  /** The quantity of the ingredient. */
  quantity: number;
  /** The unit of measurement (e.g., "cups", "grams"). */
  unit: string;
}

/**
 * Represents a culinary recipe.
 */
export interface Recipe {
  /** Unique identifier for the recipe. */
  id: string;
  /** The name of the dish. */
  name: string;
  /** A brief description of the recipe. */
  description: string;
  /** List of ingredients required. */
  ingredients: Ingredient[];
  /** Step-by-step cooking instructions. */
  instructions: string[];
  /** Preparation time (e.g., "15 mins"). */
  prepTime: string;
  /** Cooking time (e.g., "45 mins"). */
  cookTime: string;
  /** Number of servings the recipe yields. */
  servings: number;
  /** List of dietary tags (e.g., "Vegan", "Gluten-Free"). */
  dietary: string[];
}

/**
 * Represents a budget range for a gift.
 */
export interface GiftBudget {
  /** Minimum price. */
  min: number;
  /** Maximum price. */
  max: number;
}

/**
 * Represents a gift suggestion.
 */
export interface Gift {
  /** Unique identifier for the gift. */
  id: string;
  /** The name of the gift item. */
  name: string;
  /** Description of the gift and why it's suitable. */
  description: string;
  /** Targeted recipient types (e.g., "Dad", "Teenager"). */
  recipient: string[];
  /** Related interests (e.g., "Technology", "Gardening"). */
  interests: string[];
  /** The price range for the gift. */
  budget: GiftBudget;
  /** Optional URL to purchase or view the gift. */
  link?: string;
}

/**
 * Payload structure for voice commands processing.
 */
export interface VoiceCommandPayload {
  /** The transcribed text command from the user. */
  command?: string;
}

/**
 * Agent-authored note that can be text or a small table.
 */
export interface AgentNote {
  id: string;
  title: string;
  type: 'text' | 'table';
  content?: string;
  tableRows?: string[][];
}

/**
 * User preferences for personalization.
 */
export interface Preferences {
  dietary: {
    allergies: string[];
    dislikes: string[];
    diets: string[]; // e.g. "Vegan", "Keto"
  };
  gifts: {
    recipientRelationship: string; // e.g. "Mother", "Colleague"
    recipientAge: number | null;
    recipientInterests: string[];
    budgetMin: number;
    budgetMax: number;
    dislikes: string[];
  };
  decorations: {
    room: string;
    style: string; // e.g. "Modern", "Rustic"
    preferredColors: string[];
  };
}

export interface PlanStep {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

export interface AgentPlan {
  id: string;
  title: string;
  steps: PlanStep[];
}
