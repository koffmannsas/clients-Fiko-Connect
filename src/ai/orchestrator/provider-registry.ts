import { DeepSeekProvider } from "../providers/deepseek.provider";
import { GeminiProvider } from "../providers/gemini.provider";
import { OpenAIProvider } from "../providers/openai.provider";
import { FallbackProvider } from "../providers/fallback.provider";
import { AIProvider } from "../providers/types";

export class ProviderRegistry {
    private providers: AIProvider[] = [];

    constructor() {
        // V5.0 STRICT PRIORITY: DeepSeek -> Gemini -> OpenAI -> Fallback
        this.providers = [
            new DeepSeekProvider(),
            new GeminiProvider(),
            new OpenAIProvider(),
            new FallbackProvider()
        ];
    }

    getPriorityList(): AIProvider[] {
        return this.providers;
    }

    async getStatus() {
        return Promise.all(this.providers.map(async p => ({
            name: p.providerName,
            status: await p.verify() ? 'OK' : 'OFFLINE'
        })));
    }
}
