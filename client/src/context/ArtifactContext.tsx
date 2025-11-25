import React, { createContext, useState, useEffect, ReactNode } from 'react';

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

interface Table {
    id: string;
    name: string;
    seats: number;
    guests: string[];
}

interface Budget {
    limit: number;
}

export interface AgentNote {
    id: string;
    title: string;
    type: 'text' | 'table';
    content?: string;
    tableRows?: string[][];
}

export interface Preferences {
  dietary: {
    allergies: string[];
    dislikes: string[];
    diets: string[];
  };
  gifts: {
    recipientRelationship: string;
    recipientAge: number | null;
    recipientInterests: string[];
    budgetMin: number;
    budgetMax: number;
    dislikes: string[];
  };
  decorations: {
    room: string;
    style: string;
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

export interface SavedArtifacts {
  todos: TodoItem[];
  recipes: any[];
  gifts: any[];
  decorations: string[];
  seating: Table[];
  budget: Budget;
  agentNotes: AgentNote[];
  features: string[];
  preferences: Preferences;
  plan: AgentPlan | null;
}

interface ArtifactContextType {
  artifacts: SavedArtifacts;
  loading: boolean;
  scenario: string;
  setScenario: (name: string) => Promise<void>;
  refreshArtifacts: (targetScenario?: string) => Promise<void>;
  saveArtifacts: (updated: SavedArtifacts) => Promise<void>;
  addRecipe: (recipe: any) => void;
  addGift: (gift: any) => void;
  addDecoration: (decoration: string) => void;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  activeTab: number;
  setActiveTab: (tab: number) => void;
}

export const ArtifactContext = createContext<ArtifactContextType | undefined>(undefined);

export const ArtifactProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [artifacts, setArtifacts] = useState<SavedArtifacts>({ 
      todos: [], 
      recipes: [], 
      gifts: [], 
      decorations: [], 
      seating: [], 
      budget: { limit: 0 }, 
      agentNotes: [], 
      features: ['recipes', 'gifts', 'decorations'],
      preferences: {
          dietary: { allergies: [], dislikes: [], diets: [] },
          gifts: { recipientRelationship: "", recipientAge: null, recipientInterests: [], budgetMin: 0, budgetMax: 0, dislikes: [] },
          decorations: { room: "", style: "", preferredColors: [] }
      },
      plan: null
  });
  const [scenario, setScenarioState] = useState(() => {
      return localStorage.getItem('currentScenario') || 'default';
  });
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    refreshArtifacts(scenario);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario]);

  const cleanScenario = (value: string) => {
    const trimmed = value?.trim().toLowerCase();
    return trimmed || 'default';
  };

  const refreshArtifacts = async (targetScenario?: string) => {
    const scenarioName = cleanScenario(targetScenario || scenario);
    setLoading(true);
    try {
        const res = await fetch(`/api/artifacts?scenario=${encodeURIComponent(scenarioName)}`);
        if (res.ok) {
            const data = await res.json();
            setArtifacts({
                todos: Array.isArray(data?.todos) ? data.todos : [],
                recipes: Array.isArray(data?.recipes) ? data.recipes : [],
                gifts: Array.isArray(data?.gifts) ? data.gifts : [],
                decorations: Array.isArray(data?.decorations) ? data.decorations : [],
                seating: Array.isArray(data?.seating) ? data.seating : [],
                budget: data?.budget || { limit: 0 },
                agentNotes: Array.isArray(data?.agentNotes) ? data.agentNotes : [],
                features: Array.isArray(data?.features) ? data.features : ['recipes', 'gifts', 'decorations'],
                preferences: data?.preferences || {
                    dietary: { allergies: [], dislikes: [], diets: [] },
                    gifts: { recipientRelationship: "", recipientAge: null, recipientInterests: [], budgetMin: 0, budgetMax: 0, dislikes: [] },
                    decorations: { room: "", style: "", preferredColors: [] }
                },
                plan: data?.plan || null
            });
        }
    } catch (e) {
        console.error("Failed to load artifacts", e);
    } finally {
        setLoading(false);
    }
  };

  const saveArtifacts = async (updated: SavedArtifacts) => {
    const scenarioName = cleanScenario(scenario);
    setArtifacts(updated); // Optimistic
    try {
        await fetch(`/api/artifacts?scenario=${encodeURIComponent(scenarioName)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
        });
    } catch (e) {
        console.error("Failed to save artifacts", e);
    }
  };

  const setScenario = async (name: string) => {
    const cleaned = cleanScenario(name);
    setScenarioState(cleaned);
    localStorage.setItem('currentScenario', cleaned);
  };

  const addRecipe = (recipe: any) => {
      const updated = { ...artifacts, recipes: [...artifacts.recipes, recipe] };
      saveArtifacts(updated);
      setPanelOpen(true);
      setActiveTab(2); 
  };

  const addGift = (gift: any) => {
      const updated = { ...artifacts, gifts: [...artifacts.gifts, gift] };
      saveArtifacts(updated);
      setPanelOpen(true);
      setActiveTab(1); 
  };

  const addDecoration = (decoration: string) => {
      const updated = { ...artifacts, decorations: [...artifacts.decorations, decoration] };
      saveArtifacts(updated);
      setPanelOpen(true);
      setActiveTab(3); 
  };

  return (
    <ArtifactContext.Provider value={{ 
        artifacts, 
        loading, 
        scenario,
        setScenario,
        refreshArtifacts,
        saveArtifacts, 
        addRecipe, 
        addGift, 
        addDecoration,
        panelOpen, 
        setPanelOpen,
        activeTab,
        setActiveTab
    }}>
      {children}
    </ArtifactContext.Provider>
  );
};
