import { Ingredient } from '../models/types';

/**
 * Scales a list of ingredients based on the target number of servings.
 * 
 * @param {Ingredient[]} originalIngredients - The list of ingredients for the original serving size.
 * @param {number} originalServings - The original number of servings.
 * @param {number} targetServings - The desired number of servings.
 * @returns {Ingredient[]} The scaled list of ingredients.
 * Returns original ingredients if target or original servings are invalid (<= 0).
 */
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