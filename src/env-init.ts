import dotenv from "dotenv";
dotenv.config();

// Industrial Security: Purge sensitive variables from frontend access
if (process.env.NODE_ENV === "production") {
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.GOOGLE_GEMINI_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
}

// Industrial Certification: Project ID Enforcement
process.env.FIREBASE_PROJECT_ID = "krypton-ai-490214";
