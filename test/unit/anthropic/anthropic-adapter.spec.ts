import type { LlmRequest, LlmResponse } from '@google/adk';
import Chance from 'chance';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnthropicAdapter } from '../../../src/anthropic/anthropic-adapter.js';

const mockCreate = vi.fn();
const mockStream = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = {
      create: mockCreate,
      stream: mockStream,
    };
    constructor() {}
  }

  return { default: MockAnthropic };
});

describe('AnthropicAdapter', () => {
  const chance = new Chance();

  let model: string;
  let baseUrl: string;
  let headers: Record<string, string>;
  let apiKey: string;
  let adapter: AnthropicAdapter;

  beforeEach(() => {
    vi.clearAllMocks();

    model = `claude-${chance.word()}`;
    baseUrl = chance.url();
    headers = { [chance.word()]: chance.string(), [chance.word()]: chance.string() };
    apiKey = chance.string();
    adapter = new AnthropicAdapter(model, baseUrl, headers, apiKey);
  });

  describe('generate', () => {
    it('should pass model, mapped input, temperature, and max_tokens to client.messages.create', async () => {
      const inputText = chance.sentence();
      const temperature = chance.floating({ min: 0, max: 2 });
      const maxOutputTokens = chance.integer({ min: 1, max: 4096 });
      const llmRequest = {
        contents: [{ parts: [{ text: inputText }] }],
        config: { temperature, maxOutputTokens },
      } as unknown as LlmRequest;

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: chance.sentence() }],
      });

      await adapter.generate(llmRequest);

      expect(mockCreate).toHaveBeenCalledOnce();
      expect(mockCreate).toHaveBeenCalledWith({
        model,
        max_tokens: maxOutputTokens,
        messages: [{ role: 'user', content: inputText }],
        temperature,
      });
    });

    it('should default max_tokens to 1024 when maxOutputTokens is missing', async () => {
      const inputText = chance.sentence();
      const llmRequest = {
        contents: [{ parts: [{ text: inputText }] }],
      } as unknown as LlmRequest;

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: chance.sentence() }],
      });

      await adapter.generate(llmRequest);

      expect(mockCreate).toHaveBeenCalledWith({
        model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: inputText }],
        temperature: undefined,
      });
    });

    it('should return concatenated text blocks only', async () => {
      const first = chance.sentence();
      const second = chance.sentence();
      const llmRequest = {
        contents: [{ parts: [{ text: chance.sentence() }] }],
      } as unknown as LlmRequest;

      mockCreate.mockResolvedValue({
        content: [
          { type: 'text', text: first },
          { type: 'tool_use', id: chance.guid(), name: chance.word(), input: {} },
          { type: 'text', text: second },
        ],
      });

      const result = await adapter.generate(llmRequest);

      expect(result).toEqual({
        content: {
          role: 'model',
          parts: [{ text: `${first}${second}` }],
        },
      });
    });

    it('should wrap and rethrow errors from client.messages.create', async () => {
      const errorMessage = chance.sentence();
      const llmRequest = {
        contents: [{ parts: [{ text: chance.sentence() }] }],
      } as unknown as LlmRequest;

      mockCreate.mockRejectedValue(new Error(errorMessage));

      await expect(adapter.generate(llmRequest)).rejects.toThrow(
        `Anthropic response creation failed: ${errorMessage}`,
      );
    });

    it('should stringify non-Error thrown values', async () => {
      const errorValue = chance.sentence();
      const llmRequest = {
        contents: [{ parts: [{ text: chance.sentence() }] }],
      } as unknown as LlmRequest;

      mockCreate.mockRejectedValue(errorValue);

      await expect(adapter.generate(llmRequest)).rejects.toThrow(
        `Anthropic response creation failed: ${errorValue}`,
      );
    });
  });

  describe('stream', () => {
    it('should pass model, mapped input, temperature, and max_tokens to client.messages.stream', async () => {
      const inputText = chance.sentence();
      const temperature = chance.floating({ min: 0, max: 2 });
      const maxOutputTokens = chance.integer({ min: 1, max: 4096 });
      const llmRequest = {
        contents: [{ parts: [{ text: inputText }] }],
        config: { temperature, maxOutputTokens },
      } as unknown as LlmRequest;

      async function* emptyStream() {}
      mockStream.mockReturnValue(emptyStream());

      for await (const _ of adapter.stream(llmRequest)) {
        // consume
      }

      expect(mockStream).toHaveBeenCalledOnce();
      expect(mockStream).toHaveBeenCalledWith({
        model,
        max_tokens: maxOutputTokens,
        messages: [{ role: 'user', content: inputText }],
        temperature,
      });
    });

    it('should default max_tokens to 1024 when maxOutputTokens is missing', async () => {
      const inputText = chance.sentence();
      const llmRequest = {
        contents: [{ parts: [{ text: inputText }] }],
      } as unknown as LlmRequest;

      async function* emptyStream() {}
      mockStream.mockReturnValue(emptyStream());

      for await (const _ of adapter.stream(llmRequest)) {
        // consume
      }

      expect(mockStream).toHaveBeenCalledWith({
        model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: inputText }],
        temperature: undefined,
      });
    });

    it('should yield partial text chunks for text deltas and a final non-partial response', async () => {
      const delta1 = chance.sentence();
      const delta2 = chance.sentence();
      const llmRequest = {
        contents: [{ parts: [{ text: chance.sentence() }] }],
      } as unknown as LlmRequest;

      async function* fakeStream() {
        yield { type: 'content_block_delta', delta: { type: 'text_delta', text: delta1 } };
        yield {
          type: 'content_block_delta',
          delta: { type: 'input_json_delta', partial_json: '{}' },
        };
        yield { type: 'content_block_delta', delta: { type: 'text_delta', text: delta2 } };
      }
      mockStream.mockReturnValue(fakeStream());

      const results: LlmResponse[] = [];

      for await (const chunk of adapter.stream(llmRequest)) {
        results.push(chunk);
      }

      expect(results).toEqual([
        {
          content: { role: 'model', parts: [{ text: delta1 }] },
          partial: true,
        },
        {
          content: { role: 'model', parts: [{ text: delta2 }] },
          partial: true,
        },
        {
          content: { role: 'model', parts: [{ text: '' }] },
          partial: false,
        },
      ]);
    });

    it('should wrap and rethrow stream iteration errors', async () => {
      const errorMessage = chance.sentence();
      const llmRequest = {
        contents: [{ parts: [{ text: chance.sentence() }] }],
      } as unknown as LlmRequest;

      // eslint-disable-next-line require-yield
      async function* brokenStream() {
        throw new Error(errorMessage);
      }
      mockStream.mockReturnValue(brokenStream());

      await expect(async () => {
        for await (const _ of adapter.stream(llmRequest)) {
          // consume
        }
      }).rejects.toThrow(`Anthropic stream creation failed: ${errorMessage}`);
    });
  });
});
