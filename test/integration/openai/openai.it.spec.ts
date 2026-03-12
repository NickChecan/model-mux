import {
  InMemorySessionService,
  LlmAgent,
  Runner,
  StreamingMode,
  isFinalResponse,
  stringifyContent,
} from '@google/adk';
import dotenv from 'dotenv';
import { ModelMux } from '../../../src/index.js';

const models = [
  'gpt-4o-2024-11-20',
  'gpt-5-2025-08-07',
  'gpt-5.1-2025-11-13',
  'gpt-5.2-2025-12-11',
  'gpt-5.4-2026-03-05',
];

describe.each(models)('openai integration: %s', (llm) => {
  const host = 'https://api.openai.com/v1';
  const headers = {};
  const appName = 'test-app';
  const userId = 'test-user';

  beforeAll(() => {
    dotenv.config();
  });

  it('should generate an answer to a one-shot ad hoc request', async () => {
    // Arrange
    const apiKey = process.env.API_KEY_OPENAI || '';
    const sessionId = `test-session-${llm}`;

    const sessionService = new InMemorySessionService();
    await sessionService.createSession({ appName, userId, sessionId });

    // Act 1
    const model = new ModelMux(llm, host, headers, apiKey);

    // Act 2
    const agent = new LlmAgent({
      name: 'test-agent',
      description: 'An agent for testing purposes',
      instruction: 'Return "yes" or "no", nothing else.',
      model: model,
    });

    // Act 3
    const runner = new Runner({ appName, agent, sessionService });
    const events = await runner.runAsync({
      userId,
      sessionId,
      newMessage: {
        role: 'user',
        parts: [{ text: 'Is this thing working?' }],
      },
    });

    // Act 4
    let answer;
    for await (const event of events) {
      if (isFinalResponse(event)) answer = stringifyContent(event).trim();
    }

    // Assert
    expect(answer).toBeTruthy();
  });

  it('should stream an answer in multiple chunks to an ad hoc request', async () => {
    // Arrange
    const apiKey = process.env.API_KEY_OPENAI || '';
    const sessionId = `test-session-stream-${llm}`;

    const sessionService = new InMemorySessionService();
    await sessionService.createSession({ appName, userId, sessionId });

    // Act 1
    const model = new ModelMux(llm, host, headers, apiKey);

    // Act 2
    const agent = new LlmAgent({
      name: 'test-agent',
      description: 'An agent for testing purposes',
      instruction: 'Return "yes" or "no", nothing else.',
      model: model,
    });

    // Act 3
    const runner = new Runner({ appName, agent, sessionService });
    const events = await runner.runAsync({
      userId,
      sessionId,
      newMessage: {
        role: 'user',
        parts: [{ text: 'Is this thing working?' }],
      },
      runConfig: { streamingMode: StreamingMode.SSE },
    });

    // Act 4
    const chunks: string[] = [];
    for await (const event of events) {
      const text = stringifyContent(event).trim();
      if (text) chunks.push(text);
    }
    const answer = chunks.join('');

    // Assert
    expect(chunks.length).toBeGreaterThan(0);
    expect(answer).toBeTruthy();
  });
});
