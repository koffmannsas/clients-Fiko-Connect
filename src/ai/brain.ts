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

        // --- LONG TERM MEMORY FETCH ---
        let ltmContext = "";
        try {
            const memorySnap = await db.collection('fiko_memory').doc(companyId).get();
            const ltm = memorySnap.data()?.longTermMemory || {};
            if (ltm[leadId]) {
                ltmContext = `\nRésumé de la relation avec ce client: ${ltm[leadId]}\n`;
            }
        } catch (e) {
            console.error("[FikoBrain] LTM fetch error:", e);
        }

        // --- LEAD SCORING & QUALIFICATION ---
        let qualificationContext = "";
        if (leadId !== "system_ltm") {
            try {
                const scoringPrompt = `ANALYSE DE QUALIFICATION. Client: "${message}".
                Donne un score de 0 à 100 sur l'intention d'achat et identifie le besoin principal.
                JSON uniquement: { "score": 80, "need": "...", "objection": "..." }`;
                const scoringRaw = await orchestrator.generateResponse(companyId, "scorer", scoringPrompt, "Lead Scorer");
                const scoring = JSON.parse(scoringRaw.replace(/```json|```/g, '').trim());
                qualificationContext = `\n[INTERNAL] Lead Score: ${scoring.score}/100. Besoin: ${scoring.need}. Objection: ${scoring.objection}\n`;

                // Persist score
                await db.collection('leads').doc(`${companyId}_${leadId}`).set({
                    qualificationScore: scoring.score,
                    detectedNeed: scoring.need,
                    lastObjection: scoring.objection
                }, { merge: true });
            } catch (e) {
                console.warn("[FikoBrain] Scorer failed", e);
            }
        }

        const prompt = `Tu es FIKO CLOSER ELITE.${historyPrompt}${ltmContext}${qualificationContext}\n${marketInstructions}\n\nContexte Business: ${businessContext}\nMessage Client: "${message}"\n\nRéponds de manière stratégique pour amener à la vente ou à la qualification.`;

        try {
            const response = await orchestrator.generateResponse(companyId, leadId, prompt, businessContext);

            // --- ASYNC SUMMARIZATION (LTM UPDATE) ---
            this.updateLTM(companyId, leadId, message, response).catch(console.error);

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

    private async updateLTM(companyId: string, leadId: string, message: string, response: string) {
        const db = getFirestore();
        const memoryRef = db.collection('fiko_memory').doc(companyId);

        const summaryPrompt = `Fais un résumé ultra-court (1 phrase) de cet échange pour la mémoire à long terme. Client: "${message}" -> Assistant: "${response}"`;

        try {
            const summary = await orchestrator.generateResponse(companyId, "system_ltm", summaryPrompt, "Summarizer");
            await memoryRef.set({
                longTermMemory: {
                    [leadId]: summary
                }
            }, { merge: true });
        } catch (e) {
            console.error("[FikoBrain] LTM Update failed:", e);
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
