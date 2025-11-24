import redisClient from '../config/db';
import { Gift, Recipe } from '../models/types';

const recipes: Recipe[] = [
  {
    id: '1',
    name: 'Classic Sugar Cookies',
    description: 'Perfect for holiday decorating.',
    ingredients: [
      { item: 'flour', quantity: 2, unit: 'cups' },
      { item: 'butter', quantity: 1, unit: 'cup' },
      { item: 'sugar', quantity: 1, unit: 'cup' },
      { item: 'egg', quantity: 1, unit: 'large' },
      { item: 'vanilla extract', quantity: 1, unit: 'tsp' },
      { item: 'baking powder', quantity: 1, unit: 'tsp' },
      { item: 'salt', quantity: 0.5, unit: 'tsp' },
    ],
    instructions: [
      'Cream butter and sugar.',
      'Beat in egg and vanilla.',
      'Combine dry ingredients and add to wet.',
      'Chill dough, roll out, cut shapes, and bake.',
    ],
    prepTime: '20 min',
    cookTime: '10 min',
    servings: 24,
    dietary: ['vegetarian'],
  },
  {
    id: '2',
    name: 'Roasted Turkey',
    description: 'A festive centerpiece for any holiday meal.',
    ingredients: [
      { item: 'turkey', quantity: 1, unit: '12-14 lb' },
      { item: 'butter', quantity: 0.5, unit: 'cup' },
      { item: 'onion', quantity: 1, unit: 'large' },
      { item: 'celery', quantity: 2, unit: 'stalks' },
      { item: 'carrots', quantity: 2, unit: 'large' },
      { item: 'chicken broth', quantity: 4, unit: 'cups' },
      { item: 'fresh herbs', quantity: 1, unit: 'bunch' },
    ],
    instructions: [
      'Preheat oven. Prepare turkey.',
      'Rub with butter and season.',
      'Stuff with aromatics.',
      'Roast until internal temperature reaches 165°F.',
    ],
    prepTime: '30 min',
    cookTime: '3-4 hours',
    servings: 10,
    dietary: [],
  },
];

const gifts: Gift[] = [
  {
    id: '1',
    name: 'Cozy Winter Scarf',
    description: 'A warm and stylish scarf, perfect for cold weather.',
    recipient: ['mom', 'friend', 'sister'],
    interests: ['fashion', 'comfort'],
    budget: { min: 20, max: 40 },
    link: 'https://example.com/scarf',
  },
  {
    id: '2',
    name: 'Noise-Cancelling Headphones',
    description: 'High-quality headphones for music lovers or those needing quiet.',
    recipient: ['dad', 'brother', 'tech enthusiast'],
    interests: ['music', 'travel', 'tech'],
    budget: { min: 100, max: 250 },
    link: 'https://example.com/headphones',
  },
  {
    id: '3',
    name: 'Gardening Tool Set',
    description: 'A durable and ergonomic set of tools for the avid gardener.',
    recipient: ['grandma', 'aunt', 'gardener'],
    interests: ['gardening', 'outdoors'],
    budget: { min: 40, max: 80 },
    link: 'https://example.com/gardening-set',
  },
  {
    id: '4',
    name: 'Board Game - Catan',
    description: 'A classic strategy board game for family and friends.',
    recipient: ['family', 'friend', 'teenager'],
    interests: ['board games', 'strategy', 'social'],
    budget: { min: 30, max: 50 },
    link: 'https://example.com/catan',
  },
  {
    id: '5',
    name: 'Gourmet Coffee Sampler',
    description: 'A selection of premium coffee beans from around the world.',
    recipient: ['coffee lover', 'colleague'],
    interests: ['coffee', 'foodie'],
    budget: { min: 25, max: 60 },
    link: 'https://example.com/coffee-sampler',
  },
];

const initializeDatabase = async (): Promise<void> => {
  try {
    await redisClient.flushAll();
    console.log('Cleared existing Redis data.');

    for (const recipe of recipes) {
      await redisClient.hSet(`recipe:${recipe.id}`, { data: JSON.stringify(recipe) });
      await redisClient.sAdd('recipes', `recipe:${recipe.id}`);
    }
    console.log('Initial recipe data inserted into Redis.');

    for (const gift of gifts) {
      await redisClient.hSet(`gift:${gift.id}`, { data: JSON.stringify(gift) });
      await redisClient.sAdd('gifts', `gift:${gift.id}`);
    }
    console.log('Initial gift data inserted into Redis.');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    if (typeof redisClient.quit === 'function') {
      await redisClient.quit();
    }
  }
};

void initializeDatabase();
