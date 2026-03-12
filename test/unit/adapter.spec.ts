import type { BaseLlmConnection, LlmRequest, LlmResponse } from '@google/adk';
import Chance from 'chance';
import { describe, it, expect } from 'vitest';
import { BaseAdapter } from '../../src/adapter.js';

// Concrete subclass to test the abstract BaseAdapter
class TestAdapter extends BaseAdapter {
  constructor(model: string, baseUrl: string, headers: Record<string, string>, apiKey: string) {
    super(model, baseUrl, headers, apiKey);
  }

  // Expose protected members for testing
  get exposedModel() {
    return this.model;
  }
  get exposedBaseUrl() {
    return this.baseUrl;
  }
  get exposedHeaders() {
    return this.headers;
  }
  get exposedApiKey() {
    return this.apiKey;
  }
  exposedMapInput(req: LlmRequest) {
    return this.mapInput(req);
  }

  async *stream(_llmRequest: LlmRequest): AsyncGenerator<LlmResponse, void> {
    // stub
  }
  async generate(_llmRequest: LlmRequest): Promise<LlmResponse> {
    return {} as LlmResponse;
  }
  async connect(_llmRequest: LlmRequest): Promise<BaseLlmConnection> {
    return {} as BaseLlmConnection;
  }
}

describe('BaseAdapter', () => {
  const chance = new Chance();

  let model: string;
  let baseUrl: string;
  let headers: Record<string, string>;
  let apiKey: string;
  let adapter: TestAdapter;

  beforeEach(() => {
    model = chance.word();
    baseUrl = chance.url();
    headers = { [chance.word()]: chance.string(), [chance.word()]: chance.string() };
    apiKey = chance.string();
    adapter = new TestAdapter(model, baseUrl, headers, apiKey);
  });

  describe('constructor', () => {
    it('should store model', () => {
      // Assert
      expect(adapter.exposedModel).toBe(model);
    });

    it('should store baseUrl', () => {
      // Assert
      expect(adapter.exposedBaseUrl).toBe(baseUrl);
    });

    it('should store headers', () => {
      // Assert
      expect(adapter.exposedHeaders).toBe(headers);
    });

    it('should store apiKey', () => {
      // Assert
      expect(adapter.exposedApiKey).toBe(apiKey);
    });
  });

  describe('mapInput', () => {
    it('should extract text from contents with parts', () => {
      // Arrange
      const text1 = chance.sentence();
      const text2 = chance.sentence();
      const req = {
        contents: [{ parts: [{ text: text1 }] }, { parts: [{ text: text2 }] }],
      } as unknown as LlmRequest;

      // Act
      const result = adapter.exposedMapInput(req);

      // Assert
      expect(result).toBe(text1 + text2);
    });

    it('should handle contents with multiple parts in a single content', () => {
      // Arrange
      const text1 = chance.sentence();
      const text2 = chance.sentence();
      const req = {
        contents: [{ parts: [{ text: text1 }, { text: text2 }] }],
      } as unknown as LlmRequest;

      // Act
      const result = adapter.exposedMapInput(req);

      // Assert
      expect(result).toBe(text1 + text2);
    });

    it('should handle parts with missing text by using empty string', () => {
      // Arrange
      const text1 = chance.sentence();
      const req = {
        contents: [{ parts: [{ text: text1 }, { notText: chance.word() }] }],
      } as unknown as LlmRequest;

      // Act
      const result = adapter.exposedMapInput(req);

      // Assert
      expect(result).toBe(text1);
    });

    it('should handle contents with missing parts by flatMapping to empty', () => {
      // Arrange
      const text1 = chance.sentence();
      const req = {
        contents: [{ parts: [{ text: text1 }] }, {}],
      } as unknown as LlmRequest;

      // Act
      const result = adapter.exposedMapInput(req);

      // Assert
      expect(result).toBe(text1);
    });

    it('should fall back to input when contents is not an array', () => {
      // Arrange
      const inputText = chance.sentence();
      const req = { input: inputText } as unknown as LlmRequest;

      // Act
      const result = adapter.exposedMapInput(req);

      // Assert
      expect(result).toBe(inputText);
    });

    it('should fall back to prompt when input is not present', () => {
      // Arrange
      const promptText = chance.sentence();
      const req = { prompt: promptText } as unknown as LlmRequest;

      // Act
      const result = adapter.exposedMapInput(req);

      // Assert
      expect(result).toBe(promptText);
    });

    it('should prefer input over prompt when both are present', () => {
      // Arrange
      const inputText = chance.sentence();
      const promptText = chance.sentence();
      const req = { input: inputText, prompt: promptText } as unknown as LlmRequest;

      // Act
      const result = adapter.exposedMapInput(req);

      // Assert
      expect(result).toBe(inputText);
    });

    it('should fall back to messages when input and prompt are not present', () => {
      // Arrange
      const role1 = chance.word();
      const content1 = chance.sentence();
      const role2 = chance.word();
      const content2 = chance.sentence();
      const req = {
        messages: [
          { role: role1, content: content1 },
          { role: role2, content: content2 },
        ],
      } as unknown as LlmRequest;

      // Act
      const result = adapter.exposedMapInput(req);

      // Assert
      expect(result).toBe(`${role1}: ${content1}\n${role2}: ${content2}`);
    });

    it('should return empty string when no recognized fields are present', () => {
      // Arrange
      const req = {} as unknown as LlmRequest;

      // Act
      const result = adapter.exposedMapInput(req);

      // Assert
      expect(result).toBe('');
    });

    it('should fall back when contents is an array but produces no text', () => {
      // Arrange
      const inputText = chance.sentence();
      const req = {
        contents: [{ parts: [{ notText: chance.word() }] }],
        input: inputText,
      } as unknown as LlmRequest;

      // Act
      const result = adapter.exposedMapInput(req);

      // Assert
      expect(result).toBe(inputText);
    });

    it('should fall back when contents is an empty array', () => {
      // Arrange
      const promptText = chance.sentence();
      const req = {
        contents: [],
        prompt: promptText,
      } as unknown as LlmRequest;

      // Act
      const result = adapter.exposedMapInput(req);

      // Assert
      expect(result).toBe(promptText);
    });

    it('should handle a single message in messages array', () => {
      // Arrange
      const role = chance.word();
      const content = chance.sentence();
      const req = {
        messages: [{ role, content }],
      } as unknown as LlmRequest;

      // Act
      const result = adapter.exposedMapInput(req);

      // Assert
      expect(result).toBe(`${role}: ${content}`);
    });
  });
});
