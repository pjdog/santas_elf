import fs from 'fs';
import path from 'path';
import type { SavedArtifacts } from '../routes/artifacts';
import { sanitizeScenario } from './scenario';

const ARTIFACT_ROOT = path.join(process.cwd(), 'data', 'artifacts');

/**
 * Persist artifacts to disk for debugging/export.
 * Folder layout: data/artifacts/{scenario}/{userId}/{type}.json
 */
export const persistArtifactsToDisk = async (userId: string, scenario: string, artifacts: SavedArtifacts) => {
    if (!userId) return;
    try {
        const scenarioKey = sanitizeScenario(scenario || 'default');
        const dir = path.join(ARTIFACT_ROOT, scenarioKey, userId);
        await fs.promises.mkdir(dir, { recursive: true });

        const payload: Record<string, any> = {
            todos: artifacts.todos,
            recipes: artifacts.recipes,
            gifts: artifacts.gifts,
            decorations: artifacts.decorations,
            seating: artifacts.seating,
            budget: artifacts.budget,
            notes: artifacts.agentNotes,
            features: artifacts.features
        };

        await Promise.all(
            Object.entries(payload).map(([key, value]) => 
                fs.promises.writeFile(
                    path.join(dir, `${key}.json`),
                    JSON.stringify(value ?? [], null, 2),
                    'utf-8'
                )
            )
        );
    } catch (err) {
        console.error('Failed to persist artifacts to disk', err);
    }
};
