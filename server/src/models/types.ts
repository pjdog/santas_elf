export interface Ingredient {
  item: string;
  quantity: number;
  unit: string;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  ingredients: Ingredient[];
  instructions: string[];
  prepTime: string;
  cookTime: string;
  servings: number;
  dietary: string[];
}

export interface GiftBudget {
  min: number;
  max: number;
}

export interface Gift {
  id: string;
  name: string;
  description: string;
  recipient: string[];
  interests: string[];
  budget: GiftBudget;
  link?: string;
}

export interface VoiceCommandPayload {
  command?: string;
}
