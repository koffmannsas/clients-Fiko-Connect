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

        const prompt = `Tu es FIKO CLOSER ELITE.${historyPrompt}\n${marketInstructions}\n\nContexte Business: ${businessContext}\nMessage Client: "${message}"\n\nRéponds de manière stratégique pour amener à la vente ou à la qualification.`;

        try {
            return await orchestrator.generateResponse(companyId, leadId, prompt, businessContext);
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
