import type { BaseLlmConnection, LlmRequest, LlmResponse } from '@google/adk';
import OpenAI from 'openai';
import { BaseAdapter } from '../adapter.js';


export class OpenAIAdapter extends BaseAdapter {
  private readonly client: OpenAI;

  constructor(model: string, baseUrl: string, headers: Record<string, string>, apiKey: string) {
    super(model, baseUrl, headers, apiKey);
    this.client = new OpenAI({
      apiKey: apiKey,
      baseURL: baseUrl,
      defaultHeaders: headers,
    });
  }

  async *stream(llmRequest: LlmRequest): AsyncGenerator<LlmResponse, void> {
    let stream;
    try {
      stream = await this.client.responses.create({
        model: this.model,
        input: this.mapInput(llmRequest),
        temperature: llmRequest.config?.temperature ?? undefined,
        max_output_tokens: llmRequest.config?.maxOutputTokens ?? undefined,
        stream: true,
      });
    } catch (error) {
      throw new Error(
        `OpenAI stream creation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    for await (const event of stream) {
      if (event.type === 'response.output_text.delta' && event.delta) {
        yield {
          content: {
            role: 'model',
            parts: [{ text: event.delta }],
          },
          partial: true,
        } satisfies LlmResponse;
      }

      if (event.type === 'response.completed') {
        yield {
          content: {
            role: 'model',
            parts: [{ text: '' }],
          },
          partial: false,
        } satisfies LlmResponse;
        return;
      }
    }
  }

  async generate(llmRequest: LlmRequest): Promise<LlmResponse> {
    let response;
    try {
      response = await this.client.responses.create({
        model: this.model,
        input: this.mapInput(llmRequest),
        temperature: llmRequest.config?.temperature ?? undefined,
        max_output_tokens: llmRequest.config?.maxOutputTokens ?? undefined,
      });
    } catch (error) {
      throw new Error(
        `OpenAI response creation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return {
      content: {
        role: 'model',
        parts: [{ text: response.output_text }],
      },
    } satisfies LlmResponse;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async connect(llmRequest: LlmRequest): Promise<BaseLlmConnection> {
    // Implementation for connecting to OpenAI
    throw new Error('Not implemented');
  }
}
