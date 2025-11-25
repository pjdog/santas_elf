import readline from 'readline';
import axios from 'axios';

const BASE_URL = process.env.AGENT_BASE_URL || 'http://localhost:5000';
const CLI_SECRET = process.env.CLI_SECRET;
const GOOGLE_ID_TOKEN = process.env.GOOGLE_ID_TOKEN || process.env.CLI_GOOGLE_ID_TOKEN;

if (!CLI_SECRET && !GOOGLE_ID_TOKEN) {
  console.error('Set CLI_SECRET or GOOGLE_ID_TOKEN (Google ID token) to use the agent CLI.');
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '🎄 elf> ',
});

console.log('Santa\'s Elf CLI');
console.log(`Talking to ${BASE_URL}/api/agent/chat (Ctrl+C to exit)`);
rl.prompt();

rl.on('line', async (line) => {
  const prompt = line.trim();
  if (!prompt) {
    rl.prompt();
    return;
  }

  try {
    const headers: Record<string, string> = {};
    if (CLI_SECRET) headers['x-cli-secret'] = CLI_SECRET;
    if (GOOGLE_ID_TOKEN) headers['Authorization'] = `Bearer ${GOOGLE_ID_TOKEN}`;

    const res = await axios.post(
      `${BASE_URL}/api/agent/chat`,
      { prompt },
      { headers }
    );
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err: any) {
    const msg = err?.response?.data || err.message || err;
    console.error('Error:', msg);
  }
  rl.prompt();
}).on('close', () => {
  console.log('Bye!');
  process.exit(0);
});
