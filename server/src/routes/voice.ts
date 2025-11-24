import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import redisClient from '../config/db';
import { VoiceCommandPayload } from '../types';
import { tools } from '../tools';

const router = Router();

router.post('/', async (req: Request<unknown, unknown, VoiceCommandPayload>, res: Response) => {
  const { command } = req.body;
  const user = req.user as { id: string }; // Assuming user is authenticated

  if (!user) {
    return res.status(401).json({ message: 'User not authenticated' });
  }

  console.log(`Backend received voice command from user ${user.id}:`, command);

  try {
    const settings = await redisClient.hGetAll('llm:settings');
    if (!settings.apiKey || !settings.model) {
      return res.status(400).json({ message: 'LLM not configured. Please set up the LLM in the settings.' });
    }

    const genAI = new GoogleGenerativeAI(settings.apiKey);
    const model = genAI.getGenerativeModel({ model: settings.model });

    const historyKey = `conversation:${user.id}`;
    const history = await redisClient.lRange(historyKey, 0, -1);

    const toolDefinitions = Object.keys(tools).map(toolName => {
        return `${toolName}: ${tools[toolName].description}`;
    }).join('\n');

    const prompt = `
      You are a helpful assistant for a holiday-themed app called "Santa's Elf".
      You have access to the following tools:
      ${toolDefinitions}

      Based on the conversation history and the user's command, decide if you need to use a tool.
      If you need to use a tool, respond with a JSON object with the following structure:
      {
        "thought": "Your reasoning for choosing the tool.",
        "tool_to_use": "tool_name",
        "parameters": "the parameters for the tool"
      }
      
      If you don't need to use a tool, respond with a JSON object with the following structure:
      {
        "thought": "Your reasoning for not using a tool.",
        "response": "Your natural language response to the user."
      }

      This is the conversation history:
      ${history.join('\n')}

      User's command: "${command}"
    `;

    const result = await model.generateContent(prompt);
    const responseJson = result.response.text();
    const parsedResponse = JSON.parse(responseJson);

    let message;

    if (parsedResponse.tool_to_use) {
        const tool = tools[parsedResponse.tool_to_use];
        if (tool) {
            const toolResult = await tool.function(parsedResponse.parameters);
            
            const finalPrompt = `
                You are a helpful assistant for a holiday-themed app called "Santa's Elf".
                You just used the tool "${parsedResponse.tool_to_use}" with the parameters "${parsedResponse.parameters}".
                The result of the tool is:
                ${JSON.stringify(toolResult)}

                Based on this result, formulate a natural language response to the user.
            `;
            const finalResult = await model.generateContent(finalPrompt);
            message = finalResult.response.text();
        } else {
            message = "I tried to use a tool that doesn't exist. Please try again.";
        }
    } else {
        message = parsedResponse.response;
    }

    // Save to history
    await redisClient.rPush(historyKey, `User: ${command}`);
    await redisClient.rPush(historyKey, `AI: ${message}`);
    await redisClient.lTrim(historyKey, -20, -1);

    res.json({ message });

  } catch (error) {
    console.error('Error processing voice command with LLM:', error);
    res.status(500).json({ message: 'Error processing voice command.' });
  }
});

export default router;
