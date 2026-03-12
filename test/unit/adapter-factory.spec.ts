import Chance from 'chance';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdapterFactory } from '../../src/adapter-factory.js';
import { OpenAIAdapter } from '../../src/openai/openai-adapter.js';

const mockOpenAIConstructor = vi.fn();

vi.mock('../../src/openai/openai-adapter.js', () => {
  class MockOpenAIAdapter {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(...args: any[]) {
      mockOpenAIConstructor(...args);
    }
  }
  return { OpenAIAdapter: MockOpenAIAdapter };
});

describe('AdapterFactory', () => {
  const chance = new Chance();

  let baseUrl: string;
  let headers: Record<string, string>;
  let apiKey: string;

  beforeEach(() => {
    vi.clearAllMocks();

    baseUrl = chance.url();
    headers = { [chance.word()]: chance.string(), [chance.word()]: chance.string() };
    apiKey = chance.string();
  });

  describe('createAdapter', () => {
    it("should create an OpenAIAdapter when model starts with 'gpt-'", () => {
      // Arrange
      const model = `gpt-${chance.word()}`;

      // Act
      AdapterFactory.createAdapter(model, baseUrl, headers, apiKey);

      // Assert
      expect(mockOpenAIConstructor).toHaveBeenCalledOnce();
      expect(mockOpenAIConstructor).toHaveBeenCalledWith(model, baseUrl, headers, apiKey);
    });

    it('should return an instance of OpenAIAdapter for gpt- models', () => {
      // Arrange
      const model = `gpt-${chance.word()}`;

      // Act
      const result = AdapterFactory.createAdapter(model, baseUrl, headers, apiKey);

      // Assert
      expect(result).toBeInstanceOf(OpenAIAdapter);
    });

    it('should pass model, baseUrl, headers, and apiKey to OpenAIAdapter', () => {
      // Arrange
      const model = `gpt-${chance.word()}`;
      const specificBaseUrl = chance.url();
      const specificHeaders = { [chance.word()]: chance.string() };
      const specificApiKey = chance.string();

      // Act
      AdapterFactory.createAdapter(model, specificBaseUrl, specificHeaders, specificApiKey);

      // Assert
      expect(mockOpenAIConstructor).toHaveBeenCalledWith(
        model,
        specificBaseUrl,
        specificHeaders,
        specificApiKey,
      );
    });

    it('should throw an error for unsupported model prefixes', () => {
      // Arrange
      const model = chance.word();

      // Act & Assert
      expect(() => AdapterFactory.createAdapter(model, baseUrl, headers, apiKey)).toThrow(
        `Unsupported model/provider: ${model}`,
      );
    });

    it('should throw an error when model is an empty string', () => {
      // Act & Assert
      expect(() => AdapterFactory.createAdapter('', baseUrl, headers, apiKey)).toThrow(
        'Unsupported model/provider: ',
      );
    });

    it('should not instantiate OpenAIAdapter for unsupported models', () => {
      // Arrange
      const model = chance.word();

      // Act
      try {
        AdapterFactory.createAdapter(model, baseUrl, headers, apiKey);
      } catch {
        // expected
      }

      // Assert
      expect(mockOpenAIConstructor).not.toHaveBeenCalled();
    });

    it("should handle model 'gpt-' with no suffix", () => {
      // Arrange
      const model = 'gpt-';

      // Act
      AdapterFactory.createAdapter(model, baseUrl, headers, apiKey);

      // Assert
      expect(mockOpenAIConstructor).toHaveBeenCalledOnce();
      expect(mockOpenAIConstructor).toHaveBeenCalledWith(model, baseUrl, headers, apiKey);
    });
  });
});
