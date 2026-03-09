import { BaseLlm, BaseLlmConnection, LlmRequest, LlmResponse } from "@google/adk";
import { AdapterFactory } from "./adapter-factory.js";
import { BaseAdapter } from "./adapter.js";

export class ModelMux extends BaseLlm {

    private readonly adapter: BaseAdapter;

    constructor(
        override readonly model: string,
        private readonly baseUrl: string,
        private readonly headers: Record<string, string>,
        private readonly apiKey: string,
    ) {
        super({ model });
        this.adapter = AdapterFactory.createAdapter(model, baseUrl, headers, apiKey);
    }

    override async *generateContentAsync(
        llmRequest: LlmRequest,
        stream?: boolean,
    ): AsyncGenerator<LlmResponse, void> {
        if (stream) {
            yield* this.adapter.stream(llmRequest);
            return;
        }

        const oneShot = await this.adapter.generate(llmRequest);
        yield oneShot;
    }

    async connect(_llmRequest: LlmRequest): Promise<BaseLlmConnection> {
        // For “live” sessions / bidirectional streaming
        return this.adapter.connect(_llmRequest);
    }

}