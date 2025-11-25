import React, { createContext, useContext, useState, ReactNode } from 'react';

type RecipePrefs = {
  query: string;
  guests: number;
  dietary: string;
};

type GiftPrefs = {
  recipient: string;
  interests: string;
  budgetMin: string;
  budgetMax: string;
};

type DecorationPrefs = {
  roomHint: string;
};

type AssistantContextType = {
  recipePrefs: RecipePrefs;
  giftPrefs: GiftPrefs;
  decorationPrefs: DecorationPrefs;
  setRecipePrefs: (update: Partial<RecipePrefs>) => void;
  setGiftPrefs: (update: Partial<GiftPrefs>) => void;
  setDecorationPrefs: (update: Partial<DecorationPrefs>) => void;
  applyChatInsights: (prompt: string) => void;
};

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

const defaultRecipePrefs: RecipePrefs = {
  query: 'Christmas dinner',
  guests: 1,
  dietary: '',
};

const defaultGiftPrefs: GiftPrefs = {
  recipient: '',
  interests: '',
  budgetMin: '',
  budgetMax: '',
};

const defaultDecorationPrefs: DecorationPrefs = {
  roomHint: '',
};

export const AssistantProvider = ({ children }: { children: ReactNode }) => {
  const [recipePrefs, updateRecipePrefs] = useState<RecipePrefs>(defaultRecipePrefs);
  const [giftPrefs, updateGiftPrefs] = useState<GiftPrefs>(defaultGiftPrefs);
  const [decorationPrefs, updateDecorationPrefs] = useState<DecorationPrefs>(defaultDecorationPrefs);

  const setRecipePrefs = (update: Partial<RecipePrefs>) =>
    updateRecipePrefs((prev) => ({ ...prev, ...update }));
  const setGiftPrefs = (update: Partial<GiftPrefs>) =>
    updateGiftPrefs((prev) => ({ ...prev, ...update }));
  const setDecorationPrefs = (update: Partial<DecorationPrefs>) =>
    updateDecorationPrefs((prev) => ({ ...prev, ...update }));

  const applyChatInsights = (prompt: string) => {
    const lower = prompt.toLowerCase();

    // Recipes
    const guests = lower.match(/(\d+)\s*(guests?|people|servings?)/);
    const dietary = lower.match(/(vegan|vegetarian|gluten[- ]?free|dairy[- ]?free|keto|paleo)/);
    if (guests) setRecipePrefs({ guests: Number(guests[1]) });
    if (dietary) setRecipePrefs({ dietary: dietary[1] });
    setRecipePrefs({ query: prompt.trim() || defaultRecipePrefs.query });

    // Gifts
    const recipient = lower.match(/\b(mom|dad|friend|partner|child|kid|wife|husband|sister|brother|grandma|grandpa)\b/);
    if (recipient) setGiftPrefs({ recipient: recipient[1] });

    const interests = lower.match(/\b(loves|likes|into)\s+([a-z\s]+)/);
    if (interests) setGiftPrefs({ interests: interests[2].trim() });

    const range = lower.match(/\$?(\d+)\s*(?:-|to)\s*\$?(\d+)/);
    if (range) {
      setGiftPrefs({ budgetMin: range[1], budgetMax: range[2] });
    } else {
      const max = lower.match(/max\s*\$?(\d+)/);
      if (max) setGiftPrefs({ budgetMax: max[1] });
      const min = lower.match(/min\s*\$?(\d+)/);
      if (min) setGiftPrefs({ budgetMin: min[1] });
    }

    // Decorations
    const room = lower.match(/\b(living room|bedroom|office|kitchen|dining room)\b/);
    if (room) setDecorationPrefs({ roomHint: room[1] });
  };

  return (
    <AssistantContext.Provider
      value={{
        recipePrefs,
        giftPrefs,
        decorationPrefs,
        setRecipePrefs,
        setGiftPrefs,
        setDecorationPrefs,
        applyChatInsights,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
};

export const useAssistantContext = () => {
  const ctx = useContext(AssistantContext);
  if (!ctx) {
    throw new Error('useAssistantContext must be used within AssistantProvider');
  }
  return ctx;
};
