import { InMemorySessionService, LlmAgent, Runner, isFinalResponse, stringifyContent } from "@google/adk";
import { ModelMux } from "../../src/index.js";
import dotenv from 'dotenv';

describe('setup openai', () => {
    it('should generate an answer to a one-shot ad hoc request', async () => {
        // Arrange
        dotenv.config();

        const llm = 'gpt-5.2-2025-12-11';
        const host = 'https://api.openai.com/v1';
        const headers = {};
        const apiKey = process.env.API_KEY_OPENAI || "";

        const appName = 'test-app';
        const userId = 'test-user';
        const sessionId = "test-session";

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
        const runner = new Runner({appName: 'test-app', agent, sessionService});
        const events = await runner.runAsync({
            userId,
            sessionId,
            newMessage: {
                role: 'user',
                parts: [{ text: 'Is this thing working?' }],
            }
        });

        // Act 4
        let answer;
        for await (const event of events) {
            if (isFinalResponse(event)) answer = stringifyContent(event).trim();
        }

        // Assert
        expect(answer).toBeDefined();
        expect(answer).not.toBe('');
        expect(answer).toMatch(/\b(?:yes|no)\b/i);
    })
})