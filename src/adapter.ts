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
    const contents = (req as any).contents;
    if (Array.isArray(contents)) {
      const text = contents
        .flatMap((content: any) => content?.parts ?? [])
        .map((part: any) => part?.text ?? '')
        .join('');

      if (text) {
        return text;
      }
    }

    return (
      (req as any).input ??
      (req as any).prompt ??
      ((req as any).messages
        ? (req as any).messages.map((m: any) => `${m.role}: ${m.content}`).join('\n')
        : '')
    );
  }

  abstract stream(llmRequest: LlmRequest): AsyncGenerator<LlmResponse, void>;
  abstract generate(llmRequest: LlmRequest): Promise<LlmResponse>;
  abstract connect(llmRequest: LlmRequest): Promise<BaseLlmConnection>;
}
