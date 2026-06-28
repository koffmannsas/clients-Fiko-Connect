import dotenv from "dotenv";
dotenv.config();

// Industrial Security: Project ID Enforcement
// Defaults to production if not provided in .env
process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "krypton-ai-490214";
