import dotenv from "dotenv";
dotenv.config();

// Industrial Security: Project ID Enforcement
// We do NOT delete variables here as the server requires them.
process.env.FIREBASE_PROJECT_ID = "krypton-ai-490214";
