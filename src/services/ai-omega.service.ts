import { db } from '../lib/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';

export interface AISummaryResponse {
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  objections: string[];
  recommendedAction: string;
}

export class AIOmegaService {
  static async getSalesInsights(companyId: string, leadId: string) {
    try {
      const res = await fetch("/api/ai/generic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          leadId,
          prompt: "Analyses ce lead. Donne moi : 1. Un score de conversion (0-100), 2. Les objections détectées, 3. La probabilité d'opportunité, 4. La meilleure action de relance. JSON: { \"score\": 0, \"objections\": [], \"action\": \"\" }",
          context: "Tu es Fiko Closer Elite."
        })
      });
      return await res.json();
    } catch (e) {
      console.error("[AIOmega] Insight failure", e);
      return null;
    }
  }

  static async generateCampaign(companyId: string, prompt: string) {
    try {
      const res = await fetch("/api/ai/generic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          prompt: `Crée une campagne WhatsApp basée sur: "${prompt}". JSON: { "name": "", "message": "", "cta": "", "segmentation": "" }`,
          context: "Campaign Builder"
        })
      });
      return await res.json();
    } catch (e) {
      console.error("[AIOmega] Campaign generation failure", e);
      return { name: "Erreur", message: "Échec de génération", cta: "", segmentation: "" };
    }
  }

  static async analyzeConversation(companyId: string, leadId: string, history: string[]): Promise<AISummaryResponse> {
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, leadId, history })
      });
      return await res.json();
    } catch (e) {
      console.error("[AIOmega] Conversation analysis failure", e);
      return { summary: "Erreur d'analyse", sentiment: 'neutral', objections: [], recommendedAction: "Relance manuelle" };
    }
  }

  static async queryBrain(companyId: string, input: string, context: any) {
    try {
      const res = await fetch("/api/ai/generic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, prompt: input, context: JSON.stringify(context) })
      });
      const data = await res.json();
      return data.response || data;
    } catch (e) {
      console.error("[AIOmega] Brain query failure", e);
      return "Désolé, je rencontre une difficulté technique.";
    }
  }

  static async detectMarketTone(text: string): Promise<'Standard' | 'Nouchi' | 'Local'> {
    const africanKeywords = ['dja', 'vié', 'kpakpato', 'chap', 'gaou', 'mogo'];
    const lowerText = text.toLowerCase();
    if (africanKeywords.some(k => lowerText.includes(k))) return 'Nouchi';
    return 'Standard';
  }
}

// Export alias for compatibility
export const AiOmegaService = AIOmegaService;
