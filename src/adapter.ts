import type { BaseLlmConnection, LlmRequest, LlmResponse } from '@google/adk';

interface AdapterInterface {
  stream(llmRequest: LlmRequest): AsyncGenerator<LlmResponse, void>;
  generate(llmRequest: LlmRequest): Promise<LlmResponse>;
  connect(llmRequest: LlmRequest): Promise<BaseLlmConnection>;
}

export abstract class BaseAdapter implements AdapterInterface {
  constructor(
    protected readonly model: string,
    protected readonly baseUrl: string,
    protected readonly headers: Record<string, string>,
    protected readonly apiKey: string,
  ) {}

  protected mapInput(req: LlmRequest): string {
    return req.contents
      .flatMap((content) => content.parts ?? [])
      .map((part) => part.text ?? '')
      .join('');
  }

  abstract stream(llmRequest: LlmRequest): AsyncGenerator<LlmResponse, void>;
  abstract generate(llmRequest: LlmRequest): Promise<LlmResponse>;
  abstract connect(llmRequest: LlmRequest): Promise<BaseLlmConnection>;
}
