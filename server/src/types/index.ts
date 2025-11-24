export interface VoiceCommandPayload {
    command: string;
}

export interface Recipe {
    id: string;
    name: string;
    description: string;
    ingredients: { item: string; quantity: number; unit: string }[];
    instructions: string[];
    prepTime: string;
    cookTime: string;
    servings: number;
    dietary: string[];
}

export interface Gift {
    id: string;
    name: string;
    description: string;
    recipient: string[];
    interests: string[];
    budget: { min: number; max: number };
    link: string;
}