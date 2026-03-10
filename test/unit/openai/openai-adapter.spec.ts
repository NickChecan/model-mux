import { describe, it, expect, vi, beforeEach } from "vitest";
import { LlmRequest, LlmResponse } from "@google/adk";
import { OpenAIAdapter } from "../../../src/openai/openai-adapter.js";
import Chance from "chance";

const mockCreate = vi.fn();

vi.mock("openai", () => {
  class MockOpenAI {
    responses = { create: mockCreate };
    constructor() {}
  }
  return { default: MockOpenAI };
});

describe("OpenAIAdapter", () => {
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

  describe("generate", () => {
    it("should pass model, mapped input, temperature, and max_output_tokens to client.responses.create", async () => {
      // Arrange
      const inputText = chance.sentence();
      const temperature = chance.floating({ min: 0, max: 2 });
      const maxTokens = chance.integer({ min: 1, max: 4096 });
      const llmRequest = { input: inputText, temperature, maxTokens } as unknown as LlmRequest;
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
        max_output_tokens: maxTokens,
      });
    });

    it("should use max_output_tokens from request when maxTokens is not present", async () => {
      // Arrange
      const inputText = chance.sentence();
      const maxOutputTokens = chance.integer({ min: 1, max: 4096 });
      const llmRequest = { input: inputText, max_output_tokens: maxOutputTokens } as unknown as LlmRequest;
      mockCreate.mockResolvedValue({ output_text: chance.sentence() });

      // Act
      await adapter.generate(llmRequest);

      // Assert
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ max_output_tokens: maxOutputTokens }),
      );
    });

    it("should prefer maxTokens over max_output_tokens from request", async () => {
      // Arrange
      const maxTokens = chance.integer({ min: 1, max: 4096 });
      const maxOutputTokens = chance.integer({ min: 1, max: 4096 });
      const llmRequest = { input: chance.sentence(), maxTokens, max_output_tokens: maxOutputTokens } as unknown as LlmRequest;
      mockCreate.mockResolvedValue({ output_text: chance.sentence() });

      // Act
      await adapter.generate(llmRequest);

      // Assert
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ max_output_tokens: maxTokens }),
      );
    });

    it("should return response with text from output_text", async () => {
      // Arrange
      const outputText = chance.sentence();
      const llmRequest = { input: chance.sentence() } as unknown as LlmRequest;
      const rawResponse = { output_text: outputText };
      mockCreate.mockResolvedValue(rawResponse);

      // Act
      const result = await adapter.generate(llmRequest);

      // Assert
      expect(result).toEqual({
        content: {
          role: "model",
          parts: [{ text: outputText }],
        },
        raw: rawResponse,
      });
    });

    it("should extract text from output[].content[].text when output_text is missing", async () => {
      // Arrange
      const text1 = chance.sentence();
      const text2 = chance.sentence();
      const llmRequest = { input: chance.sentence() } as unknown as LlmRequest;
      const rawResponse = {
        output: [
          { content: [{ text: text1 }, { text: text2 }] },
        ],
      };
      mockCreate.mockResolvedValue(rawResponse);

      // Act
      const result = await adapter.generate(llmRequest);

      // Assert
      expect(result).toEqual({
        content: {
          role: "model",
          parts: [{ text: text1 + text2 }],
        },
        raw: rawResponse,
      });
    });

    it("should return empty text when output_text and output are both missing", async () => {
      // Arrange
      const llmRequest = { input: chance.sentence() } as unknown as LlmRequest;
      const rawResponse = {};
      mockCreate.mockResolvedValue(rawResponse);

      // Act
      const result = await adapter.generate(llmRequest);

      // Assert
      expect(result).toEqual({
        content: {
          role: "model",
          parts: [{ text: "" }],
        },
        raw: rawResponse,
      });
    });

    it("should handle output entries with missing content gracefully", async () => {
      // Arrange
      const llmRequest = { input: chance.sentence() } as unknown as LlmRequest;
      const rawResponse = { output: [{}] };
      mockCreate.mockResolvedValue(rawResponse);

      // Act
      const result = await adapter.generate(llmRequest);

      // Assert
      expect(result).toEqual({
        content: {
          role: "model",
          parts: [{ text: "" }],
        },
        raw: rawResponse,
      });
    });

    it("should handle content entries with missing text by defaulting to empty string", async () => {
      // Arrange
      const llmRequest = { input: chance.sentence() } as unknown as LlmRequest;
      const rawResponse = { output: [{ content: [{ notText: chance.word() }] }] };
      mockCreate.mockResolvedValue(rawResponse);

      // Act
      const result = await adapter.generate(llmRequest);

      // Assert
      expect(result).toEqual({
        content: {
          role: "model",
          parts: [{ text: "" }],
        },
        raw: rawResponse,
      });
    });

    it("should wrap and rethrow errors from client.responses.create", async () => {
      // Arrange
      const errorMessage = chance.sentence();
      const llmRequest = { input: chance.sentence() } as unknown as LlmRequest;
      mockCreate.mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(adapter.generate(llmRequest))
        .rejects.toThrow(`OpenAI response creation failed: ${errorMessage}`);
    });

    it("should stringify non-Error thrown values", async () => {
      // Arrange
      const errorValue = chance.sentence();
      const llmRequest = { input: chance.sentence() } as unknown as LlmRequest;
      mockCreate.mockRejectedValue(errorValue);

      // Act & Assert
      await expect(adapter.generate(llmRequest))
        .rejects.toThrow(`OpenAI response creation failed: ${errorValue}`);
    });

    it("should not include stream option in create call", async () => {
      // Arrange
      const llmRequest = { input: chance.sentence() } as unknown as LlmRequest;
      mockCreate.mockResolvedValue({ output_text: chance.sentence() });

      // Act
      await adapter.generate(llmRequest);

      // Assert
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty("stream");
    });
  });

  describe("stream", () => {
    it("should pass model, mapped input, temperature, max_output_tokens, and stream:true to client.responses.create", async () => {
      // Arrange
      const inputText = chance.sentence();
      const temperature = chance.floating({ min: 0, max: 2 });
      const maxTokens = chance.integer({ min: 1, max: 4096 });
      const llmRequest = { input: inputText, temperature, maxTokens } as unknown as LlmRequest;

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
        max_output_tokens: maxTokens,
        stream: true,
      });
    });

    it("should use max_output_tokens from request when maxTokens is not present", async () => {
      // Arrange
      const maxOutputTokens = chance.integer({ min: 1, max: 4096 });
      const llmRequest = { input: chance.sentence(), max_output_tokens: maxOutputTokens } as unknown as LlmRequest;

      async function* emptyStream() {}
      mockCreate.mockResolvedValue(emptyStream());

      // Act
      for await (const _ of adapter.stream(llmRequest)) {
        // consume
      }

      // Assert
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ max_output_tokens: maxOutputTokens }),
      );
    });

    it("should yield responses for response.output_text.delta events", async () => {
      // Arrange
      const delta1 = chance.sentence();
      const delta2 = chance.sentence();
      const llmRequest = { input: chance.sentence() } as unknown as LlmRequest;

      const event1 = { type: "response.output_text.delta", delta: delta1 };
      const event2 = { type: "response.output_text.delta", delta: delta2 };

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
        content: { role: "model", parts: [{ text: delta1 }] },
        partial: true,
        raw: event1,
      });
      expect(results[1]).toEqual({
        content: { role: "model", parts: [{ text: delta2 }] },
        partial: true,
        raw: event2,
      });
    });

    it("should stop yielding when response.completed event is received", async () => {
      // Arrange
      const delta = chance.sentence();
      const llmRequest = { input: chance.sentence() } as unknown as LlmRequest;

      async function* fakeStream() {
        yield { type: "response.output_text.delta", delta };
        yield { type: "response.completed" };
        yield { type: "response.output_text.delta", delta: chance.sentence() };
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

    it("should skip events that are not delta or completed", async () => {
      // Arrange
      const delta = chance.sentence();
      const llmRequest = { input: chance.sentence() } as unknown as LlmRequest;

      async function* fakeStream() {
        yield { type: "response.created" };
        yield { type: "response.output_text.delta", delta };
        yield { type: "response.in_progress" };
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
        content: { role: "model", parts: [{ text: delta }] },
        partial: true,
        raw: { type: "response.output_text.delta", delta },
      });
    });

    it("should not yield for delta events where delta is falsy", async () => {
      // Arrange
      const llmRequest = { input: chance.sentence() } as unknown as LlmRequest;

      async function* fakeStream() {
        yield { type: "response.output_text.delta", delta: "" };
        yield { type: "response.output_text.delta", delta: null };
        yield { type: "response.output_text.delta" };
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

    it("should yield nothing when stream has no events", async () => {
      // Arrange
      const llmRequest = { input: chance.sentence() } as unknown as LlmRequest;

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

    it("should wrap and rethrow errors from client.responses.create", async () => {
      // Arrange
      const errorMessage = chance.sentence();
      const llmRequest = { input: chance.sentence() } as unknown as LlmRequest;
      mockCreate.mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(async () => {
        for await (const _ of adapter.stream(llmRequest)) {
          // consume
        }
      }).rejects.toThrow(`OpenAI stream creation failed: ${errorMessage}`);
    });

    it("should stringify non-Error thrown values from create", async () => {
      // Arrange
      const errorValue = chance.sentence();
      const llmRequest = { input: chance.sentence() } as unknown as LlmRequest;
      mockCreate.mockRejectedValue(errorValue);

      // Act & Assert
      await expect(async () => {
        for await (const _ of adapter.stream(llmRequest)) {
          // consume
        }
      }).rejects.toThrow(`OpenAI stream creation failed: ${errorValue}`);
    });
  });

  describe("connect", () => {
    it("should throw a not implemented error", async () => {
      // Arrange
      const llmRequest = { input: chance.sentence() } as unknown as LlmRequest;

      // Act & Assert
      await expect(adapter.connect(llmRequest)).rejects.toThrow("Not implemented");
    });
  });
});
