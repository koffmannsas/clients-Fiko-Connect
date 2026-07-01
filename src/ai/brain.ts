import { orchestrator } from "./orchestrator/ai-orchestrator";
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export class FikoBrain {
    async generateSmartResponse(companyId: string, leadId: string, message: string, businessContext: string) {
        const db = getFirestore();
        let historyPrompt = "";

        try {
            const historySnap = await db.collection('messages')
                .where('conversationId', '==', leadId)
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get();

            const history = historySnap.docs
                .map(d => `${d.data().sender === 'client' ? 'Client' : 'Assistant'}: ${d.data().content}`)
                .reverse()
                .join("\n");

            if (history) {
                historyPrompt = `\nHistorique récent:\n${history}\n`;
            }
        } catch (e) {
            console.error("[FikoBrain] History fetch error:", e);
        }

        // African Sales Intelligence Context
        const marketInstructions = `
        INSTRUCTIONS DE VENTE MONDIALE (Jordan Belfort/Chris Voss):
        - Sois persuasif, empathique mais direct.
        - Identifie le besoin et propose une solution.
        - Traite les objections avec élégance.

        CONTEXTE AFRICAIN (Cote d'Ivoire, Sénégal, Cameroun, etc.):
        - Comprends les expressions locales (Nouchi, argot local).
        - Adapte le ton : respectueux, chaleureux mais professionnel.
        - Si le client utilise du Nouchi ou un ton informel, reste pro tout en montrant que tu comprends la culture.

        LANGUES : Réponds toujours dans la langue du client (Français, Anglais, Espagnol, Portugais).
        `;

        // --- V6.0 SEMANTIC RETRIEVAL & LTM ---
        let ltmContext = "";
        try {
            const memorySnap = await db.collection('fiko_memory').doc(companyId).get();
            const ltm = memorySnap.data()?.longTermMemory || {};
            if (ltm[leadId]) {
                ltmContext = `\nRésumé relation client: ${ltm[leadId]}\n`;
            }

            // Knowledge Graph Injection
            const kg = memorySnap.data()?.knowledgeGraph || {};
            if (kg.products?.length) ltmContext += `\nProduits connus: ${kg.products.join(", ")}`;
        } catch (e) {
            console.error("[FikoBrain] LTM fetch error:", e);
        }

        // --- V6.0 FIKO CLOSER™ STRATEGIC ENGINE ---
        let closerContext = "";
        if (!leadId.includes("system")) {
            try {
                const closerPrompt = `FIKO CLOSER ELITE - STRATEGIC ANALYSIS.
                Message: "${message}"
                Context: BANT/MEDDICC qualification.
                Tâches:
                1. Qualifier (Score 0-100)
                2. Intention (Score 0-100)
                3. Prochaine Action (Next Best Action)
                4. Objection Critique Détectée
                5. Stratégie de Closing recommandée
                JSON: { "score": 0, "intent": 0, "nba": "", "objection": "", "strategy": "" }`;

                const raw = await orchestrator.generateResponse(companyId, "closer_engine", closerPrompt, "Closer Strategic Analyst");
                const closer = JSON.parse(raw.replace(/```json|```/g, '').trim());

                closerContext = `\n[STRATÉGIE CLOSER]:
                - NBA: ${closer.nba}
                - STRATÉGIE: ${closer.strategy}
                - OBJECTION: ${closer.objection || 'Aucune'}\n`;

                await db.collection('leads').doc(`${companyId}_${leadId}`).set({
                    qualificationScore: closer.score,
                    buyingIntent: closer.intent,
                    nextBestAction: closer.nba,
                    closingStrategy: closer.strategy,
                    criticalObjection: closer.objection
                }, { merge: true });
            } catch (e) {
                console.warn("[FikoBrain] Closer Engine failed", e);
            }
        }

        const prompt = `Tu es FIKO CLOSER ELITE.${historyPrompt}${ltmContext}${closerContext}\n${marketInstructions}\n\nContexte Business: ${businessContext}\nMessage Client: "${message}"\n\nRéponds de manière stratégique pour amener à la vente ou à la qualification.`;

        try {
            const response = await orchestrator.generateResponse(companyId, leadId, prompt, businessContext);

            // --- ASYNC OMEGA CONVERGENCE (Memory & Learning) ---
            this.processOmegaLearning(companyId, leadId, message, response).catch(console.error);

            return response;
        } catch (error: any) {
            console.error(`[FikoBrain] Orchestrator fatal failure: ${error.message}`);
            return "Bonjour 👋 Un conseiller FiKO vous répondra dans quelques instants.";
        }
    }

    async generateGeneric(companyId: string, leadId: string, prompt: string, context: string = "Assistant Stratégique FiKO") {
        try {
            return await orchestrator.generateResponse(companyId, leadId, prompt, context);
        } catch (error: any) {
            console.error(`[FikoBrain] Generic prompt failed: ${error.message}`);
            throw error;
        }
    }

    private async processOmegaLearning(companyId: string, leadId: string, message: string, response: string) {
        const db = getFirestore();
        const memoryRef = db.collection('fiko_memory').doc(companyId);

        const learningPrompt = `ANALYSE OMEGA.
        Échange: Client: "${message}" -> Assistant: "${response}"
        Tâches:
        1. Résumé LTM (1 phrase)
        2. Extraction Knowledge Graph (Produits, Prix, Objections)
        3. Sentiment (score 0-100)
        4. Intention d'achat (score 0-100)
        JSON: { "summary": "", "kg": { "products": [], "pricing": [], "objections": [] }, "sentiment": 50, "intent": 50 }`;

        try {
            const raw = await orchestrator.generateResponse(companyId, "omega_learner", learningPrompt, "Omega Learner");
            const data = JSON.parse(raw.replace(/```json|```/g, '').trim());

            const currentMem = (await memoryRef.get()).data() || {};
            const existingKg = currentMem.knowledgeGraph || { products: [], pricing: [], objections: [] };

            // Knowledge Graph Merger
            const updatedKg = {
                products: Array.from(new Set([...existingKg.products, ...(data.kg.products || [])])),
                pricing: Array.from(new Set([...existingKg.pricing, ...(data.kg.pricing || [])])),
                objections: Array.from(new Set([...existingKg.objections, ...(data.kg.objections || [])]))
            };

            await memoryRef.set({
                longTermMemory: {
                    ...(currentMem.longTermMemory || {}),
                    [leadId]: data.summary
                },
                knowledgeGraph: updatedKg,
                lastOmegaUpdate: FieldValue.serverTimestamp()
            }, { merge: true });

            // Lead Profile Industrialization
            await db.collection('leads').doc(`${companyId}_${leadId}`).set({
                sentimentScore: data.sentiment,
                buyingIntent: data.intent,
                lastSummary: data.summary,
                updatedAt: FieldValue.serverTimestamp()
            }, { merge: true });

        } catch (e) {
            console.error("[FikoBrain] Omega Learning failed:", e);
        }
    }

    async getStatus() {
        try {
            const fullStatus = await orchestrator.getFullStatus();
            return {
                provider: "orchestrator",
                status: "ok",
                details: fullStatus
            };
        } catch (e) {
            return { status: "error", error: "Orchestrator unavailable" };
        }
    }
}

export const brain = new FikoBrain();
