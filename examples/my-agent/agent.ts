import { FunctionTool, LlmAgent } from '@google/adk';
import dotenv from 'dotenv';
import { ModelMux } from 'model-mux';
import { z } from 'zod';

dotenv.config();

/* Mock tool implementation */
const getCurrentTime = new FunctionTool({
  name: 'get_current_time',
  description: 'Returns the current time in a specified city.',
  parameters: z.object({
    city: z.string().describe('The name of the city for which to retrieve the current time.'),
  }),
  execute: ({ city }) => {
    return { status: 'success', report: `The current time in ${city} is 10:30 AM` };
  },
});

const modelMux = new ModelMux({
  model: 'gpt-5.4-2026-03-05',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: process.env.API_KEY_OPENAI,
});

export const rootAgent = new LlmAgent({
  name: 'hello_time_agent',
  model: modelMux,
  description: 'Tells the current time in a specified city.',
  instruction: `You are a helpful assistant that tells the current time in a city.
                Use the 'getCurrentTime' tool for this purpose.`,
  tools: [getCurrentTime],
});
