import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIProvider } from "./types";

export class GeminiProvider implements AIProvider {
    readonly providerName = "gemini";
    readonly modelName = "gemini-1.5-flash-latest";
    private genAI: GoogleGenerativeAI | null = null;

    constructor() {
        const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
        } else {
            console.warn("[PROVIDER] Gemini API Key missing. Provider will be marked offline.");
        }
    }

    async generateResponse(prompt: string, context: string): Promise<string> {
        if (!this.genAI) throw new Error("GEMINI_OFFLINE");
        const model = this.genAI.getGenerativeModel({ model: this.modelName });
        const result = await model.generateContent(`${context}\n\n${prompt}`);
        return result.response.text();
    }

    async verify(): Promise<boolean> {
        return !!this.genAI;
    }
}
