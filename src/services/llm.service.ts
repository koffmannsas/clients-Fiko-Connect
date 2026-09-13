import crypto from "crypto";

type LLMProviderName =
  | "deepseek"
  | "gemini"
  | "gpt"
  | "freellmapi"
  | "claude";

interface LLMRequest {
  prompt: string;
  requestId?: string;
  temperature?: number;
}

interface LLMResult {
  text: string;
  provider: LLMProviderName;
  model: string;
}

const PROVIDER_ORDER: LLMProviderName[] = [
  "deepseek",
  "gemini",
  "gpt",
  "freellmapi",
  "claude",
];

function correlationId(requestId?: string): string {
  return requestId || crypto.randomUUID();
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * FIKO CONNECT — LLM PROVIDER ORCHESTRATOR
 *
 * ORDER IS CONTRACTUAL:
 * 1. DeepSeek
 * 2. Gemini
 * 3. GPT / OpenAI
 * 4. FreeLLMAPI
 * 5. Claude
 *
 * No provider is allowed to silently change this order.
 */
export class LLMService {
  static getProviderOrder(): readonly LLMProviderName[] {
    return PROVIDER_ORDER;
  }

  static async generate(request: LLMRequest): Promise<LLMResult> {
    const id = correlationId(request.requestId);
    const errors: string[] = [];

    console.log(
      `[LLM][START] requestId=${id} providerOrder=${PROVIDER_ORDER.join(">")}`
    );

    for (const provider of PROVIDER_ORDER) {
      try {
        console.log(
          `[LLM][PROVIDER] requestId=${id} provider=${provider} status=attempt`
        );

        const result = await this.generateWithProvider(provider, request, id);

        console.log(
          `[LLM][PROVIDER] requestId=${id} provider=${provider} status=success`
        );

        return result;
      } catch (error) {
        const message = getErrorMessage(error);

        console.error(
          `[LLM][PROVIDER] requestId=${id} provider=${provider} status=failed error=${message}`
        );

        errors.push(`${provider}:${message}`);
      }
    }

    console.error(
      `[LLM][ERROR] requestId=${id} allProvidersFailed=true`
    );

    throw new Error(
      `Tous les providers LLM ont échoué. requestId=${id}`
    );
  }

  private static async generateWithProvider(
    provider: LLMProviderName,
    request: LLMRequest,
    requestId: string
  ): Promise<LLMResult> {
    switch (provider) {
      case "deepseek":
        return this.generateDeepSeek(request, requestId);

      case "gemini":
        return this.generateGemini(request, requestId);

      case "gpt":
        return this.generateGPT(request, requestId);

      case "freellmapi":
        return this.generateFreeLLMAPI(request, requestId);

      case "claude":
        return this.generateClaude(request, requestId);

      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }

  private static async generateDeepSeek(
    request: LLMRequest,
    requestId: string
  ): Promise<LLMResult> {
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      throw new Error("DEEPSEEK_API_KEY not configured");
    }

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        messages: [
          {
            role: "user",
            content: request.prompt,
          },
        ],
        temperature: request.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek HTTP ${response.status}`);
    }

    const data = (await response.json()) as any;

    const text = data?.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error("DeepSeek returned empty response");
    }

    return {
      text,
      provider: "deepseek",
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
    };
  }

  private static async generateGemini(
    request: LLMRequest,
    requestId: string
  ): Promise<LLMResult> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${
        process.env.GEMINI_MODEL || "gemini-2.5-flash"
      }:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: request.prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: request.temperature ?? 0.7,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini HTTP ${response.status}`);
    }

    const data = (await response.json()) as any;

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Gemini returned empty response");
    }

    return {
      text,
      provider: "gemini",
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    };
  }

  private static async generateGPT(
    request: LLMRequest,
    requestId: string
  ): Promise<LLMResult> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: request.prompt,
          },
        ],
        temperature: request.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI HTTP ${response.status}`);
    }

    const data = (await response.json()) as any;

    const text = data?.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error("OpenAI returned empty response");
    }

    return {
      text,
      provider: "gpt",
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    };
  }

  private static async generateFreeLLMAPI(
    request: LLMRequest,
    requestId: string
  ): Promise<LLMResult> {
    const apiKey =
      process.env.FREELLMAPI_API_KEY ||
      process.env.FREELLM_API_KEY;

    const baseUrl =
      process.env.FREELLMAPI_BASE_URL ||
      process.env.FREELLM_API_URL;

    if (!apiKey || !baseUrl) {
      throw new Error("FreeLLMAPI not configured");
    }

    const response = await fetch(
      `${baseUrl.replace(/\/$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.FREELLMAPI_MODEL || "default",
          messages: [
            {
              role: "user",
              content: request.prompt,
            },
          ],
          temperature: request.temperature ?? 0.7,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`FreeLLMAPI HTTP ${response.status}`);
    }

    const data = (await response.json()) as any;

    const text = data?.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error("FreeLLMAPI returned empty response");
    }

    return {
      text,
      provider: "freellmapi",
      model: process.env.FREELLMAPI_MODEL || "default",
    };
  }

  private static async generateClaude(
    request: LLMRequest,
    requestId: string
  ): Promise<LLMResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:
          process.env.ANTHROPIC_MODEL ||
          "claude-3-5-haiku-latest",
        max_tokens: 2048,
        temperature: request.temperature ?? 0.7,
        messages: [
          {
            role: "user",
            content: request.prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude HTTP ${response.status}`);
    }

    const data = (await response.json()) as any;

    const text = data?.content?.[0]?.text;

    if (!text) {
      throw new Error("Claude returned empty response");
    }

    return {
      text,
      provider: "claude",
      model:
        process.env.ANTHROPIC_MODEL ||
        "claude-3-5-haiku-latest",
    };
  }
}
