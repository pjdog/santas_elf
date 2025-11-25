import fs from 'fs';
import path from 'path';

const CONFIG_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

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

// Ensure data directory exists
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

/**
 * Reads and returns the application configuration from the file system.
 * Returns an empty object if the config file does not exist or cannot be read.
 * @returns {AppConfig} The current configuration.
 */
export const getConfig = (): AppConfig => {
  if (!fs.existsSync(CONFIG_FILE)) {
    return {};
  }
  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
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
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2));
    return updated;
  } catch (error) {
    console.error('Error writing config file:', error);
    throw error;
  }
};