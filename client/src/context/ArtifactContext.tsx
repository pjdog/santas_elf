import React, { createContext, useState, useEffect, ReactNode } from 'react';

/** Represents a single task in the todo list. */
interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

/** Represents a dining table configuration. */
interface Table {
    id: string;
    name: string;
    seats: number;
    guests: string[];
}

/** Represents the budget settings. */
interface Budget {
    limit: number;
}

/** Represents a note or table created by the agent. */
export interface AgentNote {
    id: string;
    title: string;
    type: 'text' | 'table';
    content?: string;
    tableRows?: string[][];
}

/** User preferences for personalization. */
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

/** A step within the agent's high-level plan. */
export interface PlanStep {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

/** The high-level plan structure. */
export interface AgentPlan {
  id: string;
  title: string;
  steps: PlanStep[];
}

/** The complete state object for a scenario. */
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
  scenarios: string[];
  /** Updates the current active scenario. */
  setScenario: (name: string) => Promise<void>;
  /** Reloads artifacts from the server. */
  refreshArtifacts: (targetScenario?: string) => Promise<void>;
  /** Updates artifacts state directly from a payload (avoids fetch). */
  updateArtifacts: (data: SavedArtifacts) => void;
  /** Persists updated artifacts to the server. */
  saveArtifacts: (updated: SavedArtifacts) => Promise<void>;
  addRecipe: (recipe: any) => void;
  addGift: (gift: any) => void;
  addDecoration: (decoration: string) => void;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  activeTab: number;
  setActiveTab: (tab: number) => void;
  /** Deletes the specified scenario and resets if current. */
  deleteScenario: (name: string) => Promise<void>;
}

export const ArtifactContext = createContext<ArtifactContextType | undefined>(undefined);

/**
 * Context provider for managing the application state (artifacts, scenario, UI state).
 * Handles data synchronization with the backend API.
 */
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
  const [scenarios, setScenarios] = useState<string[]>(['default']);
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    refreshArtifacts(scenario);
    fetchScenarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario]);

  const fetchScenarios = async () => {
      try {
          const res = await fetch('/api/artifacts/scenarios');
          if (res.ok) {
              const list = await res.json();
              setScenarios(list);
          }
      } catch (e) {
          console.error("Failed to fetch scenarios", e);
      }
  };

  const cleanScenario = (value: string) => {
    const trimmed = value?.trim().toLowerCase();
    return trimmed || 'default';
  };

  const deleteScenario = async (name: string) => {
      const scenarioName = cleanScenario(name);
      try {
          await fetch(`/api/artifacts?scenario=${encodeURIComponent(scenarioName)}`, {
              method: 'DELETE'
          });
          await fetchScenarios();
          // Reset to default after deletion if deleting current
          if (scenarioName === scenario) {
              setScenario('default');
          }
      } catch (e) {
          console.error("Failed to delete scenario", e);
      }
  };

  const refreshArtifacts = async (targetScenario?: string) => {
    const scenarioName = cleanScenario(targetScenario || scenario);
    setLoading(true);
    try {
        const res = await fetch(`/api/artifacts?scenario=${encodeURIComponent(scenarioName)}`);
        if (res.ok) {
            const data = await res.json();
            updateArtifacts(data);
        }
    } catch (e) {
        console.error("Failed to load artifacts", e);
    } finally {
        setLoading(false);
    }
  };

  const updateArtifacts = (data: any) => {
      if (!data) return;
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
        await fetchScenarios(); // Refresh list in case new scenario was implicitly created
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
        scenarios,
        setScenario,
        refreshArtifacts,
        updateArtifacts,
        saveArtifacts, 
        addRecipe, 
        addGift, 
        addDecoration,
        panelOpen, 
        setPanelOpen,
        activeTab,
        setActiveTab,
        deleteScenario
    }}>
      {children}
    </ArtifactContext.Provider>
  );
};
