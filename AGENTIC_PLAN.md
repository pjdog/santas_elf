# Agentic Upgrade Plan

## Scope & Constraints
- Confirm target surfaces (chat, recipe finder, gift guide) and whether background jobs are allowed.
- Define “agentic” as plan/execute/verify loop with proactive prompts and structured memory; note any LLM/API limits.

## Preferences as First-Class Data [COMPLETED]
- Extend artifacts to store `preferences`:
  - Dietary: allergies, dislikes, diets, servings.
  - Gifts: recipient, age, interests, budgetMin/budgetMax, dislikes.
  - Decorations: room, style, colors.
- Add load/save defaults and a merge helper that updates from chat signals.

## Clarification Flow (A/B) [COMPLETED]
- In `agent.ts`, when recipe/gift intents lack critical prefs (allergies/dislikes or recipient/interests/budget), respond with two labeled options (A/B) plus “C) Something else,” and pause tool calls.
- Store the selected option into `preferences`.

## Planner/Executor Loop [PARTIAL]
- **Implemented:** "Reasoning Loop" in `agent.ts` that checks context/history before acting.
- **Pending:** Explicit persistent plan queue (Step 1, Step 2) in artifacts.
- Add planner module to draft 3–5 steps per goal and persist in artifacts with status.
- Executor runs steps in order, calls tools, marks status, emits progress messages; allow cancel/reset.

## Tool Enrichment & Guardrails [COMPLETED]
- Recipes: merge LLM + MealDB, enforce no allergens/dislikes, tag trend sources (NYT/BA/F&W), retry on constraint violations.
- Gifts: enrich with budget bands, interests, safe search links, avoid disliked categories.
- Decorations: include style palettes and item checklists.
- Add critic pass post-tool to verify constraints; retry/fallback on failure.

## Proactive Next Steps
- After each step, suggest next action (e.g., “Generate shopping list?”) with quick chips; allow auto-advance on chip selection.

## UI Surfaces [PENDING]
- Plan/status panel showing steps and progress.
- Preference chips (allergies, dislikes, diets, budgets, recipient) with inline edit.
- Inline A/B clarification prompts in chat.

## Persistence & History
- Keep plans, preferences, and chat scenario-scoped in Redis; retain recent plans; enable per-scenario reset.

## Testing & QA
- Unit: preference merge, planner creation, critic fallback.
- Integration: A/B gating, plan execution happy-path and constraint-violation retries.
- Smoke: recipe and gift flows end-to-end.

## Telemetry & Logging
- Log tool runs, critic retries, plan state transitions; redact PII.
