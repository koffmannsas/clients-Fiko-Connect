import OpenAI from "openai";

export type LLMProvider =
  | "deepseek"
  | "gemini"
  | "gpt"
  | "freellmapi"
  | "claude";

export interface LLMRequest {
  prompt: string;
  requestId?: string;
  model?: string;
}

export interface LLMResponse {
  provider: LLMProvider;
  model: string;
  text: string;
}

function logPrefix(requestId?: string) {
  return requestId ? `[LLM][requestId=${requestId}]` : "[LLM]";
}

/**
 * FIKO CONNECT — LLM PROVIDER ORCHESTRATOR
 *
 * ORDRE CONTRACTUEL :
 * 1. DeepSeek
 * 2. Gemini
 * 3. GPT / OpenAI
 * 4. FreeLLMAPI
 * 5. Claude
 *
 * Aucun provider ne doit être appelé directement par le métier.
 */

export class LLMOrchestratorService {
  private static async callDeepSeek(
    prompt: string,
    requestId?: string
  ): Promise<LLMResponse> {
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      throw new Error("DEEPSEEK_API_KEY_MISSING");
    }

    const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";

    console.log(
      `${logPrefix(requestId)} provider=deepseek model=${model} start`
    );

    const client = new OpenAI({
      apiKey,
      baseURL: "https://api.deepseek.com"
    });

    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const text = response.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error("DEEPSEEK_EMPTY_RESPONSE");
    }

    console.log(
      `${logPrefix(requestId)} provider=deepseek model=${model} completed`
    );

    return {
      provider: "deepseek",
      model,
      text
    };
  }

  private static async callGemini(
    prompt: string,
    requestId?: string
  ): Promise<LLMResponse> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY_MISSING");
    }

    const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";

    console.log(
      `${logPrefix(requestId)} provider=gemini model=${model} start`
    );

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `GEMINI_HTTP_${response.status}:${errorText.slice(0, 500)}`
      );
    }

    const data: any = await response.json();

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("GEMINI_EMPTY_RESPONSE");
    }

    console.log(
      `${logPrefix(requestId)} provider=gemini model=${model} completed`
    );

    return {
      provider: "gemini",
      model,
      text
    };
  }

  private static async callGPT(
    prompt: string,
    requestId?: string
  ): Promise<LLMResponse> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("OPENAI_API_KEY_MISSING");
    }

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    console.log(
      `${logPrefix(requestId)} provider=gpt model=${model} start`
    );

    const client = new OpenAI({
      apiKey
    });

    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const text = response.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error("OPENAI_EMPTY_RESPONSE");
    }

    console.log(
      `${logPrefix(requestId)} provider=gpt model=${model} completed`
    );

    return {
      provider: "gpt",
      model,
      text
    };
  }

  private static async callFreeLLMAPI(
    prompt: string,
    requestId?: string
  ): Promise<LLMResponse> {
    const apiKey =
      process.env.FREELLMAPI_API_KEY ||
      process.env.FREELLM_API_KEY;

    if (!apiKey) {
      throw new Error("FREELLMAPI_API_KEY_MISSING");
    }

    const baseUrl =
      process.env.FREELLMAPI_BASE_URL ||
      "https://api.freellmapi.com/v1";

    const model =
      process.env.FREELLMAPI_MODEL ||
      "default";

    console.log(
      `${logPrefix(requestId)} provider=freellmapi model=${model} start`
    );

    const client = new OpenAI({
      apiKey,
      baseURL: baseUrl
    });

    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const text = response.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error("FREELLMAPI_EMPTY_RESPONSE");
    }

    console.log(
      `${logPrefix(requestId)} provider=freellmapi model=${model} completed`
    );

    return {
      provider: "freellmapi",
      model,
      text
    };
  }

  private static async callClaude(
    prompt: string,
    requestId?: string
  ): Promise<LLMResponse> {
    const apiKey =
      process.env.ANTHROPIC_API_KEY ||
      process.env.CLAUDE_API_KEY;

    if (!apiKey) {
      throw new Error("CLAUDE_API_KEY_MISSING");
    }

    const model =
      process.env.CLAUDE_MODEL ||
      "claude-3-5-sonnet-latest";

    console.log(
      `${logPrefix(requestId)} provider=claude model=${model} start`
    );

    const response = await fetch(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          messages: [
            {
              role: "user",
              content: prompt
            }
          ]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `CLAUDE_HTTP_${response.status}:${errorText.slice(0, 500)}`
      );
    }

    const data: any = await response.json();

    const text = data?.content
      ?.filter((item: any) => item?.type === "text")
      ?.map((item: any) => item.text)
      ?.join("\n")
      ?.trim();

    if (!text) {
      throw new Error("CLAUDE_EMPTY_RESPONSE");
    }

    console.log(
      `${logPrefix(requestId)} provider=claude model=${model} completed`
    );

    return {
      provider: "claude",
      model,
      text
    };
  }

  static async generate(
    request: LLMRequest
  ): Promise<LLMResponse> {
    const { prompt, requestId } = request;

    const providers: Array<{
      name: LLMProvider;
      call: () => Promise<LLMResponse>;
    }> = [
      {
        name: "deepseek",
        call: () => this.callDeepSeek(prompt, requestId)
      },
      {
        name: "gemini",
        call: () => this.callGemini(prompt, requestId)
      },
      {
        name: "gpt",
        call: () => this.callGPT(prompt, requestId)
      },
      {
        name: "freellmapi",
        call: () => this.callFreeLLMAPI(prompt, requestId)
      },
      {
        name: "claude",
        call: () => this.callClaude(prompt, requestId)
      }
    ];

    const failures: string[] = [];

    for (const provider of providers) {
      try {
        return await provider.call();
      } catch (error: any) {
        const reason =
          error?.message ||
          "UNKNOWN_PROVIDER_ERROR";

        failures.push(`${provider.name}:${reason}`);

        console.error(
          `${logPrefix(requestId)} provider=${provider.name} failed reason=${reason}`
        );

        console.log(
          `${logPrefix(requestId)} fallback=next provider=${provider.name}`
        );
      }
    }

    throw new Error(
      `ALL_LLM_PROVIDERS_FAILED | ${failures.join(" | ")}`
    );
  }
}
