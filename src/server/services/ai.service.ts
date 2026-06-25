import { brain } from "../../ai/brain";
import { FirestoreRepo } from "../repositories/firestore.repo";
import { FieldValue } from 'firebase-admin/firestore';

export class AIService {
    static async generateResponse(companyId: string, leadId: string, message: string) {
        const memory = await FirestoreRepo.db().collection('fiko_memory').doc(companyId).get();
        const context = memory.data()?.longTermContext || "Commercial Fiko";
        return await brain.generateSmartResponse(companyId, leadId, message, context);
    }

    static async trainDNA(companyId: string, message: string) {
        const prompt = `Tu es Fiko Knowledge Engine. Analyser le savoir commercial. JSON uniquement: { "category": "dna_products" | "dna_pricing" | "dna_objections" | "dna_competitors" | "dna_faq", "fact": "...", "response": "..." } Message: "${message}"`;
        const raw = await brain.generateGeneric(companyId, "trainer", prompt, "DNA Extraction");
        return JSON.parse(raw.replace(/```json|```/g, '').trim());
    }
}
