import type { BaseLlmConnection, LlmRequest, LlmResponse } from '@google/adk';
import { BaseAdapter } from '../adapter.js';


export class AnthropicAdapter extends BaseAdapter {
  async *stream(llmRequest: LlmRequest): AsyncGenerator<LlmResponse, void> {
    // Implementation for streaming responses from Anthropic
    throw new Error('Streaming not implemented for Anthropic yet');
  }

  async generate(llmRequest: LlmRequest): Promise<LlmResponse> {
    // Implementation for generating responses from Anthropic
    throw new Error('One-shot generation not implemented for Anthropic yet');
  }

  async connect(llmRequest: LlmRequest): Promise<BaseLlmConnection> {
    // Implementation for connecting to Anthropic
    throw new Error('Connection not implemented for Anthropic yet');
  }
}
