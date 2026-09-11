import dotenv from "dotenv";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

dotenv.config();

export interface SecretCheckResult {
  key: string;
  status: "PRESENT" | "MISSING";
}

const client = new SecretManagerServiceClient();

const SECRET_MAPPING: Record<string, string> = {
  DEEPSEEK_API_KEY: "fiko-deepseek-api-key",
  GEMINI_API_KEY: "fiko-gemini-api-key",
};

function logSecret(key: string, source: string, status: string) {
  console.log(
    `[SECRET_MANAGER] key=${key} source=${source} status=${status}`
  );
}

/**
 * FIKO CONNECT — SECRET MANAGER
 *
 * Architecture :
 *
 * Google Secret Manager
 *        ↓
 * process.env runtime
 *        ↓
 * LLM Orchestrator
 *
 * Les clés ne doivent jamais être écrites dans le repository.
 */

export async function getSecret(
  secretName: string
): Promise<string | null> {

  // 1. Priorité au runtime environment.
  // Cela permet également les overrides sécurisés du déploiement.
  const envValue = process.env[secretName];

  if (envValue) {
    logSecret(secretName, "environment", "PRESENT");
    return envValue;
  }

  // 2. Google Secret Manager pour les providers configurés.
  const secretId = SECRET_MAPPING[secretName];

  if (!secretId) {
    logSecret(secretName, "google-secret-manager", "NOT_MAPPED");
    return null;
  }

  try {
    const projectId =
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCLOUD_PROJECT ||
      process.env.GCP_PROJECT;

    if (!projectId) {
      console.error(
        `[SECRET_MANAGER] key=${secretName} project=UNKNOWN error=GCP_PROJECT_NOT_RESOLVED`
      );
      return null;
    }

    const secretPath =
      `projects/${projectId}/secrets/${secretId}/versions/latest`;

    const [version] = await client.accessSecretVersion({
      name: secretPath,
    });

    const value = version.payload?.data;

    if (!value) {
      console.error(
        `[SECRET_MANAGER] key=${secretName} secret=${secretId} error=EMPTY_SECRET`
      );
      return null;
    }

    const decoded =
      typeof value === "string"
        ? value
        : Buffer.from(value).toString("utf8");

    if (!decoded.trim()) {
      console.error(
        `[SECRET_MANAGER] key=${secretName} secret=${secretId} error=EMPTY_SECRET`
      );
      return null;
    }

    logSecret(
      secretName,
      `google-secret-manager:${secretId}`,
      "PRESENT"
    );

    return decoded.trim();

  } catch (error: any) {
    console.error(
      `[SECRET_MANAGER] key=${secretName} secret=${secretId} error=${
        error?.message || "UNKNOWN_ERROR"
      }`
    );

    return null;
  }
}

export async function checkSecrets(
  keys: string[]
): Promise<SecretCheckResult[]> {

  const results: SecretCheckResult[] = [];

  for (const key of keys) {
    const val = await getSecret(key);

    results.push({
      key,
      status: val ? "PRESENT" : "MISSING",
    });
  }

  return results;
}
