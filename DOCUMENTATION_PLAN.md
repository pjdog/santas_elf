# Comprehensive Documentation Plan

## Objective
Achieve 100% docstring coverage for all exported functions, classes, interfaces, and complex internal logic across the `server` and `client` codebases. Ensure adherence to **TSDoc** standards for consistency and better IDE support.

## 1. Standards & Conventions
We will adopt the **TSDoc** standard.
- **Format:** `/** ... */` block comments.
- **Required Tags:**
  - `@param`: For every function argument.
  - `@returns`: For the return value (if not void).
  - `@throws`: If the function explicitly throws errors.
- **Tone:** Concise, professional, and explanatory (focus on *why* and *how* if complex).

**Example:**
```typescript
/**
 * Scales a recipe's ingredients based on the desired number of servings.
 * 
 * @param recipe - The original recipe object.
 * @param targetServings - The new number of servings to scale for.
 * @returns A new recipe object with updated ingredient quantities.
 * @throws Error if targetServings is less than 1.
 */
export const scaleIngredients = (recipe: Recipe, targetServings: number): Recipe => { ... }
```

## 2. Audit & Gap Analysis
Based on initial investigation, coverage is mixed.
- **Strong Areas:** `server/src/utils/configManager.ts`, `recipeUtils.ts`, `agentExecutor.ts`.
- **Weak Areas:** `server/src/utils/social.ts`, likely many React components in `client/src`.

## 3. Execution Phases

### Phase 1: Server Core & Utilities (High Priority)
*Focus: Logic that powers the agent and data handling.*
- [ ] `server/src/utils/social.ts` (Missing entirely)
- [ ] `server/src/utils/llm.ts` (Document internal helpers)
- [ ] `server/src/utils/artifactFs.ts` (Verify coverage)
- [ ] `server/src/utils/scenario.ts`
- [ ] `server/src/models/types.ts` (Ensure all interfaces like `AgentPlan`, `Preferences` are documented)

### Phase 2: Server Routes & Tools (Medium Priority)
*Focus: API endpoints and tool definitions.*
- [ ] `server/src/tools.ts` (Ensure all tool definitions have descriptions that help the LLM *and* developers).
- [ ] `server/src/routes/agent.ts` (Document the main chat handler logic).
- [ ] `server/src/routes/artifacts.ts` (Document validation logic and endpoints).

### Phase 3: Client Components & Context (Low Priority)
*Focus: UI logic and state management.*
- [ ] `client/src/context/ArtifactContext.tsx` (Document the provider and hook).
- [ ] `client/src/context/AssistantContext.tsx`
- [ ] `client/src/components/*.tsx` (Add prop definitions for reusable components like `ThinkingElf`, `PreferencesTab`).

## 4. Automation & Enforcement
To prevent regression, we will configure ESLint to enforce documentation.
- [ ] Install `eslint-plugin-jsdoc`.
- [ ] Configure strict rules for exported members.
- [ ] Run `npm run lint` to verify compliance.

## Next Steps
1. Start **Phase 1** immediately by fixing `server/src/utils/social.ts` and auditing `server/src/models`.
2. Set up the linter rule to catch other missing spots.
