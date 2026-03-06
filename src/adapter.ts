import { BaseLlmConnection, LlmRequest, LlmResponse } from "@google/adk";
import { OpenAIAdapter } from "./openai/openai-adapter.js";

export abstract class AdapterFactory {
    static createAdapter(model: string, baseUrl: string, headers: Record<string, string>, apiKey: string): BaseAdapter {
        if (model.startsWith("gpt-"))
            return new OpenAIAdapter(model, baseUrl, headers, apiKey);
        // if (model.startsWith("claude-")) 
        //     return new AnthropicAdapter(model, baseUrl, headers, apiKey);
        throw new Error(`Unsupported model/provider: ${model}`);
    }
}

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
    ) { }

    protected mapInput(req: LlmRequest): string {
        return (
            (req as any).input ??
            (req as any).prompt ??
            ((req as any).messages
                ? (req as any).messages.map((m: any) => `${m.role}: ${m.content}`).join("\n")
                : "")
        );
    }

    abstract stream(llmRequest: LlmRequest): AsyncGenerator<LlmResponse, void>;
    abstract generate(llmRequest: LlmRequest): Promise<LlmResponse>;
    abstract connect(llmRequest: LlmRequest): Promise<BaseLlmConnection>;
}