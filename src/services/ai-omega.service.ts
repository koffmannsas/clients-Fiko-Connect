export interface AISummaryResponse {
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  objections: string[];
  recommendedAction: string;
}

export interface AICampaignResponse {
  name: string;
  message: string;
  cta: string;
  segmentation: string;
}

export class AiOmegaService {
  private static async callProxy(companyId: string, leadId: string, prompt: string, context: string): Promise<string> {
    try {
      const res = await fetch("/api/ai/generic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, leadId, prompt, context })
      });
      const data = await res.json();
      return data.response || "ERROR";
    } catch (e) {
      console.error("[AiOmega] Proxy call failed", e);
      return "ERROR";
    }
  }

  static async analyzeConversation(companyId: string, leadId: string, messages: string[]): Promise<AISummaryResponse> {
    const history = messages.join("\n");
    const prompt = `SYSTEM: Analyser cette conversation WhatsApp de vente en Afrique.
    RETOURNE UN JSON STRICT:
    {
      "summary": "Résumé de 15 mots max",
      "sentiment": "positive" | "neutral" | "negative",
      "objections": ["Prix", "Temps", "Confiance", "Concurrence"],
      "recommendedAction": "Action concrète à faire maintenant"
    }
    CONVERSATION:
    ${history}`;

    const raw = await this.callProxy(companyId, leadId, prompt, "Analyseur Sémantique OMEGA");
    try {
      // Find JSON block if AI added conversational filler
      const jsonMatch = raw.match(/\{.*\}/s);
      const jsonStr = jsonMatch ? jsonMatch[0] : raw;
      return JSON.parse(jsonStr);
    } catch {
      return { summary: "Analyse indisponible", sentiment: 'neutral', objections: [], recommendedAction: "Relancer manuellement" };
    }
  }

  static async calculateAIScore(companyId: string, leadId: string, leadData: any, history: string[]): Promise<number> {
    const prompt = `SYSTEM: Évaluer le score de conversion (0-100) de ce lead.
    Prendre en compte le sentiment, la fréquence et les objections.
    RETOURNE UNIQUEMENT LE NOMBRE.
    DATA: ${JSON.stringify(leadData)}
    HISTORY: ${history.join("\n")}`;

    const raw = await this.callProxy(companyId, leadId, prompt, "Scoreur de Leads OMEGA");
    const score = parseInt(raw.trim().replace(/[^0-9]/g, ''));
    return isNaN(score) ? 50 : score;
  }

  static async generateCampaign(companyId: string, userPrompt: string): Promise<AICampaignResponse> {
    const prompt = `SYSTEM: Créer une campagne WhatsApp marketing pour l'Afrique.
    RETOURNE UN JSON STRICT:
    {
      "name": "Nom court",
      "message": "Message WhatsApp optimisé avec emojis",
      "cta": "Appel à l'action",
      "segmentation": "Cible précise"
    }
    USER_GOAL: ${userPrompt}`;

    const raw = await this.callProxy(companyId, "system_campaign", prompt, "Générateur de Campagnes OMEGA");
    try {
      const jsonMatch = raw.match(/\{.*\}/s);
      const jsonStr = jsonMatch ? jsonMatch[0] : raw;
      return JSON.parse(jsonStr);
    } catch {
      return { name: "Campagne FiKO", message: "Bonjour !", cta: "Acheter", segmentation: "Abidjan" };
    }
  }

  static async queryBrain(companyId: string, query: string, context: any): Promise<string> {
    const prompt = `SYSTEM: Tu es FiKO Brain, l'assistant stratégique du CEO.
    Réponds de manière précise sur les ventes et les leads.
    CONTEXTE: ${JSON.stringify(context)}
    QUESTION: ${query}`;

    return await this.callProxy(companyId, "ceo_query", prompt, "Fiko Brain Copilot OMEGA");
  }
}
