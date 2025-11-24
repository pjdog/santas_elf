import { Ingredient } from '../models/types';

export const scaleIngredients = (
  originalIngredients: Ingredient[],
  originalServings: number,
  targetServings: number
): Ingredient[] => {
  if (targetServings <= 0 || originalServings <= 0) {
    return originalIngredients;
  }

  const ratio = targetServings / originalServings;
  return originalIngredients.map((ingredient) => ({
    ...ingredient,
    quantity: ingredient.quantity * ratio,
  }));
};
