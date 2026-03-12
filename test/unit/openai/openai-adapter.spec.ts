import type { LlmRequest, LlmResponse } from '@google/adk';
import Chance from 'chance';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIAdapter } from '../../../src/openai/openai-adapter.js';

const mockCreate = vi.fn();

vi.mock('openai', () => {
  class MockOpenAI {
    responses = { create: mockCreate };
    constructor() {}
  }
  return { default: MockOpenAI };
});

describe('OpenAIAdapter', () => {
  const chance = new Chance();

  let model: string;
  let baseUrl: string;
  let headers: Record<string, string>;
  let apiKey: string;
  let adapter: OpenAIAdapter;

  beforeEach(() => {
    vi.clearAllMocks();

    model = chance.word();
    baseUrl = chance.url();
    headers = { [chance.word()]: chance.string(), [chance.word()]: chance.string() };
    apiKey = chance.string();
    adapter = new OpenAIAdapter(model, baseUrl, headers, apiKey);
  });

  describe('generate', () => {
    it('should pass model, mapped input, temperature, and max_output_tokens to client.responses.create', async () => {
      // Arrange
      const inputText = chance.sentence();
      const temperature = chance.floating({ min: 0, max: 2 });
      const maxOutputTokens = chance.integer({ min: 1, max: 4096 });
      const llmRequest = {
        contents: [{ parts: [{ text: inputText }] }],
        config: { temperature, maxOutputTokens },
      } as unknown as LlmRequest;
      const outputText = chance.sentence();
      mockCreate.mockResolvedValue({ output_text: outputText });

      // Act
      await adapter.generate(llmRequest);

      // Assert
      expect(mockCreate).toHaveBeenCalledOnce();
      expect(mockCreate).toHaveBeenCalledWith({
        model,
        input: inputText,
        temperature,
        max_output_tokens: maxOutputTokens,
      });
    });

    it('should pass undefined for temperature and max_output_tokens when config is missing', async () => {
      // Arrange
      const inputText = chance.sentence();
      const llmRequest = {
        contents: [{ parts: [{ text: inputText }] }],
      } as unknown as LlmRequest;
      mockCreate.mockResolvedValue({ output_text: chance.sentence() });

      // Act
      await adapter.generate(llmRequest);

      // Assert
      expect(mockCreate).toHaveBeenCalledWith({
        model,
        input: inputText,
        temperature: undefined,
        max_output_tokens: undefined,
      });
    });

    it('should return response with text from output_text', async () => {
      // Arrange
      const outputText = chance.sentence();
      const llmRequest = {
        contents: [{ parts: [{ text: chance.sentence() }] }],
      } as unknown as LlmRequest;
      mockCreate.mockResolvedValue({ output_text: outputText });

      // Act
      const result = await adapter.generate(llmRequest);

      // Assert
      expect(result).toEqual({
        content: {
          role: 'model',
          parts: [{ text: outputText }],
        },
      });
    });

    it('should wrap and rethrow errors from client.responses.create', async () => {
      // Arrange
      const errorMessage = chance.sentence();
      const llmRequest = {
        contents: [{ parts: [{ text: chance.sentence() }] }],
      } as unknown as LlmRequest;
      mockCreate.mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(adapter.generate(llmRequest)).rejects.toThrow(
        `OpenAI response creation failed: ${errorMessage}`,
      );
    });

    it('should stringify non-Error thrown values', async () => {
      // Arrange
      const errorValue = chance.sentence();
      const llmRequest = {
        contents: [{ parts: [{ text: chance.sentence() }] }],
      } as unknown as LlmRequest;
      mockCreate.mockRejectedValue(errorValue);

      // Act & Assert
      await expect(adapter.generate(llmRequest)).rejects.toThrow(
        `OpenAI response creation failed: ${errorValue}`,
      );
    });

    it('should not include stream option in create call', async () => {
      // Arrange
      const llmRequest = {
        contents: [{ parts: [{ text: chance.sentence() }] }],
      } as unknown as LlmRequest;
      mockCreate.mockResolvedValue({ output_text: chance.sentence() });

      // Act
      await adapter.generate(llmRequest);

      // Assert
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('stream');
    });
  });

  describe('stream', () => {
    it('should pass model, mapped input, temperature, max_output_tokens, and stream:true to client.responses.create', async () => {
      // Arrange
      const inputText = chance.sentence();
      const temperature = chance.floating({ min: 0, max: 2 });
      const maxOutputTokens = chance.integer({ min: 1, max: 4096 });
      const llmRequest = {
        contents: [{ parts: [{ text: inputText }] }],
        config: { temperature, maxOutputTokens },
      } as unknown as LlmRequest;

      async function* emptyStream() {}
      mockCreate.mockResolvedValue(emptyStream());

      // Act
      for await (const _ of adapter.stream(llmRequest)) {
        // consume
      }

      // Assert
      expect(mockCreate).toHaveBeenCalledOnce();
      expect(mockCreate).toHaveBeenCalledWith({
        model,
        input: inputText,
        temperature,
        max_output_tokens: maxOutputTokens,
        stream: true,
      });
    });

    it('should pass undefined for temperature and max_output_tokens when config is missing', async () => {
      // Arrange
      const inputText = chance.sentence();
      const llmRequest = {
        contents: [{ parts: [{ text: inputText }] }],
      } as unknown as LlmRequest;

      async function* emptyStream() {}
      mockCreate.mockResolvedValue(emptyStream());

      // Act
      for await (const _ of adapter.stream(llmRequest)) {
        // consume
      }

      // Assert
      expect(mockCreate).toHaveBeenCalledWith({
        model,
        input: inputText,
        temperature: undefined,
        max_output_tokens: undefined,
        stream: true,
      });
    });

    it('should yield responses for response.output_text.delta events', async () => {
      // Arrange
      const delta1 = chance.sentence();
      const delta2 = chance.sentence();
      const llmRequest = {
        contents: [{ parts: [{ text: chance.sentence() }] }],
      } as unknown as LlmRequest;

      const event1 = { type: 'response.output_text.delta', delta: delta1 };
      const event2 = { type: 'response.output_text.delta', delta: delta2 };

      async function* fakeStream() {
        yield event1;
        yield event2;
      }
      mockCreate.mockResolvedValue(fakeStream());

      const results: LlmResponse[] = [];

      // Act
      for await (const chunk of adapter.stream(llmRequest)) {
        results.push(chunk);
      }

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        content: { role: 'model', parts: [{ text: delta1 }] },
        partial: true,
      });
      expect(results[1]).toEqual({
        content: { role: 'model', parts: [{ text: delta2 }] },
        partial: true,
      });
    });

    it('should stop yielding when response.completed event is received', async () => {
      // Arrange
      const delta = chance.sentence();
      const llmRequest = {
        contents: [{ parts: [{ text: chance.sentence() }] }],
      } as unknown as LlmRequest;

      async function* fakeStream() {
        yield { type: 'response.output_text.delta', delta };
        yield { type: 'response.completed' };
        yield { type: 'response.output_text.delta', delta: chance.sentence() };
      }
      mockCreate.mockResolvedValue(fakeStream());

      const results: LlmResponse[] = [];

      // Act
      for await (const chunk of adapter.stream(llmRequest)) {
        results.push(chunk);
      }

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({ partial: true });
      expect(results[1]).toMatchObject({ partial: false });
    });

    it('should skip events that are not delta or completed', async () => {
      // Arrange
      const delta = chance.sentence();
      const llmRequest = {
        contents: [{ parts: [{ text: chance.sentence() }] }],
      } as unknown as LlmRequest;

      async function* fakeStream() {
        yield { type: 'response.created' };
        yield { type: 'response.output_text.delta', delta };
        yield { type: 'response.in_progress' };
      }
      mockCreate.mockResolvedValue(fakeStream());

      const results: LlmResponse[] = [];

      // Act
      for await (const chunk of adapter.stream(llmRequest)) {
        results.push(chunk);
      }

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        content: { role: 'model', parts: [{ text: delta }] },
        partial: true,
      });
    });

    it('should not yield for delta events where delta is falsy', async () => {
      // Arrange
      const llmRequest = {
        contents: [{ parts: [{ text: chance.sentence() }] }],
      } as unknown as LlmRequest;

      async function* fakeStream() {
        yield { type: 'response.output_text.delta', delta: '' };
        yield { type: 'response.output_text.delta', delta: null };
        yield { type: 'response.output_text.delta' };
      }
      mockCreate.mockResolvedValue(fakeStream());

      const results: LlmResponse[] = [];

      // Act
      for await (const chunk of adapter.stream(llmRequest)) {
        results.push(chunk);
      }

      // Assert
      expect(results).toHaveLength(0);
    });

    it('should yield nothing when stream has no events', async () => {
      // Arrange
      const llmRequest = {
        contents: [{ parts: [{ text: chance.sentence() }] }],
      } as unknown as LlmRequest;

      async function* emptyStream() {}
      mockCreate.mockResolvedValue(emptyStream());

      const results: LlmResponse[] = [];

      // Act
      for await (const chunk of adapter.stream(llmRequest)) {
        results.push(chunk);
      }

      // Assert
      expect(results).toHaveLength(0);
    });

    it('should wrap and rethrow errors from client.responses.create', async () => {
      // Arrange
      const errorMessage = chance.sentence();
      const llmRequest = {
        contents: [{ parts: [{ text: chance.sentence() }] }],
      } as unknown as LlmRequest;
      mockCreate.mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(async () => {
        for await (const _ of adapter.stream(llmRequest)) {
          // consume
        }
      }).rejects.toThrow(`OpenAI stream creation failed: ${errorMessage}`);
    });

    it('should stringify non-Error thrown values from create', async () => {
      // Arrange
      const errorValue = chance.sentence();
      const llmRequest = {
        contents: [{ parts: [{ text: chance.sentence() }] }],
      } as unknown as LlmRequest;
      mockCreate.mockRejectedValue(errorValue);

      // Act & Assert
      await expect(async () => {
        for await (const _ of adapter.stream(llmRequest)) {
          // consume
        }
      }).rejects.toThrow(`OpenAI stream creation failed: ${errorValue}`);
    });
  });

  describe('connect', () => {
    it('should throw a not implemented error', async () => {
      // Arrange
      const llmRequest = {
        contents: [{ parts: [{ text: chance.sentence() }] }],
      } as unknown as LlmRequest;

      // Act & Assert
      await expect(adapter.connect(llmRequest)).rejects.toThrow('Not implemented');
    });
  });
});
