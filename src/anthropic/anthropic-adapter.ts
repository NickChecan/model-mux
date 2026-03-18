import Anthropic from '@anthropic-ai/sdk';
import type { BaseLlmConnection, LlmRequest, LlmResponse } from '@google/adk';
import { BaseAdapter } from '../adapter.js';

export class AnthropicAdapter extends BaseAdapter {
  private readonly client: Anthropic;

  constructor(model: string, baseUrl: string, headers: Record<string, string>, apiKey: string) {
    super(model, baseUrl, headers, apiKey);
    this.client = new Anthropic({
      apiKey: apiKey,
      baseURL: baseUrl,
      defaultHeaders: headers,
    });
  }

  async *stream(llmRequest: LlmRequest): AsyncGenerator<LlmResponse, void> {
    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: llmRequest.config?.maxOutputTokens ?? 1024,
      messages: [{ role: 'user', content: this.mapInput(llmRequest) }],
      temperature: llmRequest.config?.temperature ?? undefined,
    });

    try {
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield {
            content: {
              role: 'model',
              parts: [{ text: event.delta.text }],
            },
            partial: true,
          } satisfies LlmResponse;
        }
      }

      yield {
        content: {
          role: 'model',
          parts: [{ text: '' }],
        },
        partial: false,
      } satisfies LlmResponse;
    } catch (error) {
      throw new Error(
        `Anthropic stream creation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async generate(llmRequest: LlmRequest): Promise<LlmResponse> {
    let response;
    try {
      response = await this.client.messages.create({
        model: this.model,
        max_tokens: llmRequest.config?.maxOutputTokens ?? 1024,
        messages: [{ role: 'user', content: this.mapInput(llmRequest) }],
        temperature: llmRequest.config?.temperature ?? undefined,
      });
    } catch (error) {
      throw new Error(
        `Anthropic response creation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return {
      content: {
        role: 'model',
        parts: [
          {
            text: response.content
              .filter((block) => block.type === 'text')
              .map((block) => block.text)
              .join(''),
          },
        ],
      },
    } satisfies LlmResponse;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async connect(llmRequest: LlmRequest): Promise<BaseLlmConnection> {
    // Implementation for connecting to Anthropic
    throw new Error('Not implemented');
  }
}
