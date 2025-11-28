import fs from 'fs';
import path from 'path';

// Prefer an explicit override to keep Docker/local paths consistent; otherwise anchor to the repo root.
const CONFIG_DIR = process.env.SANTAS_ELF_CONFIG_DIR
  ? path.resolve(process.env.SANTAS_ELF_CONFIG_DIR)
  : path.join(path.resolve(__dirname, '..', '..'), 'data');

const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
// Legacy location used the runtime cwd; keep as a fallback so existing files are still read.
const LEGACY_CONFIG_FILE = path.join(process.cwd(), 'data', 'config.json');

console.log(`[ConfigManager] Initialized. Config File: ${CONFIG_FILE}`);

/**
 * Application Configuration Interface.
 */
interface AppConfig {
  /** Google OAuth configuration. */
  google?: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
  };
  /** Large Language Model configuration. */
  llm?: {
    provider: 'gemini' | 'openai' | 'anthropic' | 'custom';
    apiKey: string;
    model: string;
    baseUrl?: string;
  };
}

// Ensure data directories exist (both primary and legacy) so writes never fail due to missing folders.
for (const dir of new Set([CONFIG_DIR, path.dirname(LEGACY_CONFIG_FILE)])) {
  if (!fs.existsSync(dir)) {
    console.log(`[ConfigManager] Creating data directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Reads and returns the application configuration from the file system.
 * Returns an empty object if the config file does not exist or cannot be read.
 * @returns {AppConfig} The current configuration.
 */
export const getConfig = (): AppConfig => {
  const targetFile = fs.existsSync(CONFIG_FILE)
    ? CONFIG_FILE
    : (CONFIG_FILE !== LEGACY_CONFIG_FILE && fs.existsSync(LEGACY_CONFIG_FILE) ? LEGACY_CONFIG_FILE : null);

  if (!targetFile) {
    return {};
  }

  try {
    const data = fs.readFileSync(targetFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading config file:', error);
    return {};
  }
};

/**
 * Updates the application configuration.
 * Merges the provided new config with the existing one and saves it to the file system.
 * @param {Partial<AppConfig>} newConfig - The partial configuration to update.
 * @returns {AppConfig} The updated full configuration.
 * @throws {Error} If writing to the config file fails.
 */
export const saveConfig = (newConfig: Partial<AppConfig>) => {
  const current = getConfig();
  const updated = { ...current, ...newConfig };
  try {
    console.log(`[ConfigManager] Writing config to: ${CONFIG_FILE}`);
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2));
    // Keep the legacy path in sync to avoid surprises if cwd-based lookup is used elsewhere.
    if (CONFIG_FILE !== LEGACY_CONFIG_FILE) {
      fs.writeFileSync(LEGACY_CONFIG_FILE, JSON.stringify(updated, null, 2));
    }
    return updated;
  } catch (error) {
    console.error('Error writing config file:', error);
    throw error;
  }
};
