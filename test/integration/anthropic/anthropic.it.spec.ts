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
  'claude-opus-4-6', 
  'claude-sonnet-4-5-20250929', 
  'claude-haiku-4-5'
];

describe.each(models)('anthropic integration: %s', (model) => {
  const baseUrl = 'https://api.anthropic.com';
  const appName = 'test-app';
  const userId = 'test-user';

  beforeAll(() => {
    dotenv.config();
  });

  it('should generate an answer to a one-shot ad hoc request', async () => {
    // Arrange
    const apiKey = process.env.API_KEY_CLAUDE || '';
    const sessionId = `test-session-${model}`;

    const sessionService = new InMemorySessionService();
    await sessionService.createSession({ appName, userId, sessionId });

    // Act 1
    const modelMux = new ModelMux({ model, baseUrl, apiKey });

    // Act 2
    const agent = new LlmAgent({
      name: 'test-agent',
      description: 'An agent for testing purposes',
      instruction: 'Return "yes" or "no", nothing else.',
      model: modelMux,
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
    const apiKey = process.env.API_KEY_CLAUDE || '';
    const sessionId = `test-session-stream-${model}`;

    const sessionService = new InMemorySessionService();
    await sessionService.createSession({ appName, userId, sessionId });

    // Act 1
    const modelMux = new ModelMux({ model, baseUrl, apiKey });

    // Act 2
    const agent = new LlmAgent({
      name: 'test-agent',
      description: 'An agent for testing purposes',
      instruction: 'Return "yes" or "no", nothing else.',
      model: modelMux,
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
