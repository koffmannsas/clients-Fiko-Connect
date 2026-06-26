import dotenv from "dotenv";
dotenv.config();

// Industrial Security: Project ID Enforcement
// We do NOT delete variables from process.env here as the server requires them to function.
// Frontend security is handled by Vite environment variable prefixing (VITE_).
process.env.FIREBASE_PROJECT_ID = "krypton-ai-490214";
