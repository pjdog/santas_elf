# Comprehensive To-Do List for Santa's Elf

## Completed Tasks
- [x] **Agentic Capabilities:**
    - [x] Preferences as First-Class Data.
    - [x] Clarification Flow (A/B options).
    - [x] Planner/Executor Loop (ReAct).
    - [x] Reflection/Critic Step.
    - [x] Shopping Capabilities (Deal finding).
- [x] **Scenario Management:**
    - [x] Delete Scenario (Backend & Frontend).
    - [x] Switch Scenario (Backend & Frontend).
- [x] **Documentation:**
    - [x] Core Utilities (`social.ts`, `llm.ts`, `types.ts`).
    - [x] Server Routes (`agent.ts`, `artifacts.ts`).
    - [x] Client Contexts (`ArtifactContext.tsx`, `AssistantContext.tsx`).
- [x] **UI/UX:**
    - [x] Fix "Thinking" indicator logic.
    - [x] Interactive Plan Visualization (`PlanTab.tsx`).
    - [x] Sidebar "Delete" option with confirmation.
    - [x] New SVG Logo.

## Pending Issues
- [ ] **Frontend Persistence:** Chat history and API key are lost on refresh.
    - *Diagnosis:* `UserContext` or `localStorage` handling needs verification. The API key is managed via `LLMSetup` but might not be persisting correctly or rehydrating on load. Chat history *should* be fetching from the server on mount (`useEffect` in `HomePage`), so if it's missing, the `fetchHistory` call might be failing or the scenario state is resetting to default prematurely.
- [ ] **Documentation:** The project currently uses TypeDoc (`npm run docs`) which is served at `/docs`. However, `swagger-ui-express` and `swagger-jsdoc` are installed and `src/config/swagger.ts` exists but is unused. Decide whether to fully implement Swagger or remove the dependencies.

## Next Steps
1.  **Fix Persistence:** Investigate `UserContext.tsx` and `HomePage.tsx` initialization flow.
2.  **Verify API Key Loading:** Ensure `LLMSetup` saves to the backend config (it does via `configManager`), but check if the session persists or if the client needs to re-fetch config status.
