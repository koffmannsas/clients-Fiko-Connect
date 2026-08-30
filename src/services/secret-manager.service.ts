import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const PROJECT_ID = 'krypton-ai-490214';
let client: SecretManagerServiceClient | null = null;

async function getSecretValue(secretName: string): Promise<string | null> {
    try {
        // Fail silently if no GCP credentials exist to prevent unhandled rejections from google-auth-library
        // (Even in 'production' NODE_ENV, if we are in the isolated sandbox, ADC won't exist)
        if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FIREBASE_PROJECT_ID && !process.env.GCE_METADATA_HOST) {
             console.warn(`[ENV] Skipping Secret Manager lookup for ${secretName} (No credentials found in environment).`);
             return null;
        }

        if (!client) {
             client = new SecretManagerServiceClient();
        }

        const name = `projects/${PROJECT_ID}/secrets/${secretName}/versions/latest`;
        const [version] = await client.accessSecretVersion({ name });
        if (version.payload && version.payload.data) {
            return version.payload.data.toString();
        }
        return null;
    } catch (error: any) {
        // Do not crash the application if a secret is missing
        console.warn(`[ENV] Failed to load secret ${secretName} from Google Secret Manager. (Reason: ${error.message})`);
        return null;
    }
}

export async function loadAISecrets(): Promise<void> {
    console.log("[ENV] Initializing secure credentials loader...");

    // Load DeepSeek
    const deepSeekKey = await getSecretValue('DEEPSEEK_API_KEY');
    if (deepSeekKey) {
        process.env.DEEPSEEK_API_KEY = deepSeekKey;
        console.log("[ENV] DeepSeek credential: PRESENT");
    } else {
        console.log("[ENV] DeepSeek credential: MISSING");
    }

    // Load Gemini
    const geminiKey = await getSecretValue('GOOGLE_GEMINI_API_KEY');
    if (geminiKey) {
        process.env.GEMINI_API_KEY = geminiKey;
        process.env.GOOGLE_GEMINI_API_KEY = geminiKey;
        console.log("[ENV] Gemini credential: PRESENT");
    } else {
        console.log("[ENV] Gemini credential: MISSING");
    }
}
