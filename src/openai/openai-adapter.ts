import OpenAI from "openai";
import { BaseLlmConnection, LlmRequest, LlmResponse } from "@google/adk";
import { BaseAdapter } from "../adapter.js";

export class OpenAIAdapter extends BaseAdapter {
    private readonly client: OpenAI;

    constructor(
        model: string,
        baseUrl: string,
        headers: Record<string, string>,
        apiKey: string,
    ) {
        super(model, baseUrl, headers, apiKey);
        this.client = new OpenAI({
            apiKey: apiKey,
            baseURL: baseUrl,
            defaultHeaders: headers,
        });
    }

    async *stream(llmRequest: LlmRequest): AsyncGenerator<LlmResponse, void> {
        const stream = await this.client.responses.create({
            model: this.model,
            input: this.mapInput(llmRequest),
            temperature: (llmRequest as any).temperature,
            max_output_tokens: (llmRequest as any).maxTokens ?? (llmRequest as any).max_output_tokens,
            stream: true,
        });

        for await (const event of stream as any) {
            if (event.type === "response.output_text.delta" && event.delta) {
                yield {
                    content: [{ text: event.delta }],
                    raw: event,
                } as unknown as LlmResponse;
            }

            if (event.type === "response.completed") {
                return;
            }
        }
    }

    async generate(llmRequest: LlmRequest): Promise<LlmResponse> {
        const response = await this.client.responses.create({
            model: this.model,
            input: this.mapInput(llmRequest),
            temperature: (llmRequest as any).temperature,
            max_output_tokens: (llmRequest as any).maxTokens ?? (llmRequest as any).max_output_tokens,
        });

        const text =
            (response as any).output_text ??
            ((response as any).output || [])
                .flatMap((o: any) => o.content || [])
                .map((c: any) => c.text ?? "")
                .join("");

        return {
            content: [{ text }],
            raw: response,
        } as unknown as LlmResponse;
    }

    async connect(llmRequest: LlmRequest): Promise<BaseLlmConnection> {
        // Implementation for connecting to OpenAI
        throw new Error("Not implemented");
    }
}