import fs from 'fs';
import path from 'path';

const CONFIG_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

interface AppConfig {
  google?: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
  };
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
