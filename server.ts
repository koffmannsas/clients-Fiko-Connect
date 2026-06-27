import "./src/env-init";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';

// Routes
import authRoutes from "./src/server/routes/auth.routes";
import aiRoutes from "./src/server/routes/ai.routes";
import dnaRoutes from "./src/server/routes/dna.routes";
import autopilotRoutes from "./src/server/routes/autopilot.routes";
import wabaRoutes from "./src/server/routes/waba.routes";
import webhookRoutes from "./src/server/routes/webhooks.routes";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "krypton-ai-490214";

if (!getApps().length) {
    initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
}

const app = express();

// Middlewares
app.use("/api/webhooks", webhookRoutes); // Raw body needed inside for signatures
app.use(express.json());

// Load Modular Routes
app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/dna", dnaRoutes);
app.use("/api/autopilot", autopilotRoutes);
app.use("/api/waba", wabaRoutes);

// Health & Market (Legacy/Direct for now)
app.get("/health", (req, res) => res.json({ status: "ok", version: "5.0-phoenix" }));
app.get("/api/market-insights", async (req, res) => {
    // Direct access to DB for simple GETs to avoid over-engineering initial modularity
    const { getFirestore } = await import('firebase-admin/firestore');
    try {
        const snap = await getFirestore().collection('market_insights').limit(10).get();
        res.json(snap.docs.map(d => d.data()));
    } catch (e) {
        res.json([]);
    }
});

// Production SPA Serving
if (IS_PRODUCTION) {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));
}

app.listen(PORT, () => {
    console.log(`\n🔥 PHOENIX ENGINE ACTIVE [PORT ${PORT}]`);
    console.log(`🚀 Project: ${PROJECT_ID}\n`);
});
