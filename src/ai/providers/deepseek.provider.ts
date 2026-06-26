import { AIProvider } from "./types";
import axios from "axios";

export class DeepSeekProvider implements AIProvider {
    readonly providerName = "deepseek";
    readonly modelName = "deepseek-chat";

    async generateResponse(prompt: string, context: string): Promise<string> {
        const apiKey = process.env.DEEPSEEK_API_KEY;
        if (!apiKey) throw new Error("DEEPSEEK_OFFLINE");

        try {
            const response = await axios.post(
                "https://api.deepseek.com/chat/completions",
                {
                    model: this.modelName,
                    messages: [
                        { role: "system", content: context },
                        { role: "user", content: prompt }
                    ],
                    stream: false
                },
                {
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json"
                    },
                    timeout: 30000
                }
            );

            return response.data.choices[0].message.content;
        } catch (error: any) {
            console.error("DeepSeek Provider Error:", error.response?.data || error.message);
            throw new Error(`DeepSeek API Error: ${error.message}`);
        }
    }

    async verify(): Promise<boolean> {
        return !!process.env.DEEPSEEK_API_KEY;
    }
}
