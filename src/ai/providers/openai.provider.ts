import { AIProvider } from "./types";

export class OpenAIProvider implements AIProvider {
    readonly providerName = "openai";
    readonly modelName = "gpt-4o";

    async generateResponse(prompt: string, context: string): Promise<string> {
        if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_OFFLINE");
        return "Simulated OpenAI Response (Fallback)";
    }

    async verify(): Promise<boolean> {
        return !!process.env.OPENAI_API_KEY;
    }
}
