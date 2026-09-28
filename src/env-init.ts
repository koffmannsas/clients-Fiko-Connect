import dotenv from "dotenv";
import { getSecret } from "./services/secret-manager.service";

dotenv.config();

let isBootstrapped = false;

const REQUIRED_SECRETS = [
  "WHATSAPP_VERIFY_TOKEN",
  "WHATSAPP_APP_SECRET",
];

const LLM_SECRETS = [
  "DEEPSEEK_API_KEY",
  "GEMINI_API_KEY",
  "OPENAI_API_KEY",
  "FREELLMAPI_API_KEY",
  "FREELLM_API_KEY",
  "ANTHROPIC_API_KEY",
  "CLAUDE_API_KEY",
];

export async function bootstrapEnv(): Promise<void> {
  if (isBootstrapped) return;

  console.log(
    "[ENV INIT] Initializing environment & credentials bootstrap..."
  );

  /*
   * WABA secrets
   * Ces credentials restent fournis par l'environnement de déploiement.
   */
  for (const key of REQUIRED_SECRETS) {
    const value = await getSecret(key);

    if (!value) {
      throw new Error(`[ENV INIT] REQUIRED_SECRET_MISSING:${key}`);
    }

    process.env[key] = value;

    console.log(`[ENV INIT] Secret ${key}: PRESENT`);
  }

  /*
   * LLM provider secrets
   *
   * Les clés LLM sont conservées dans Google Secret Manager.
   * Elles sont chargées en mémoire dans le process Node.js
   * uniquement après le démarrage du bootstrap.
   */
  for (const key of LLM_SECRETS) {
    const value = await getSecret(key);

    if (value) {
      process.env[key] = value;
      console.log(`[ENV INIT] Secret ${key}: PRESENT`);
    } else {
      console.log(`[ENV INIT] Secret ${key}: MISSING`);
    }
  }

  console.log("[WABA] Runtime configuration:", {
    verifyTokenPresent: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
    appSecretPresent: Boolean(process.env.WHATSAPP_APP_SECRET),
    credentialsSource: "firestore-vault",
  });

  console.log("[LLM] Runtime configuration:", {
    deepseekPresent: Boolean(process.env.DEEPSEEK_API_KEY),
    geminiPresent: Boolean(process.env.GEMINI_API_KEY),
    openaiPresent: Boolean(process.env.OPENAI_API_KEY),
    freeLLMApiPresent: Boolean(
      process.env.FREELLMAPI_API_KEY ||
      process.env.FREELLM_API_KEY
    ),
    claudePresent: Boolean(
      process.env.ANTHROPIC_API_KEY ||
      process.env.CLAUDE_API_KEY
    ),
  });

  isBootstrapped = true;

  console.log(
    "[ENV INIT] Environment bootstrap completed."
  );
}
