import { db } from '../lib/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';

export class AIOmegaService {
  static async getSalesInsights(companyId: string, leadId: string) {
    try {
      const res = await fetch("/api/ai/generic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          leadId,
          prompt: "Analyses ce lead. Donne moi : 1. Un score de conversion (0-100), 2. Les objections détectées, 3. La probabilité d'opportunité, 4. La meilleure action de relance.",
          context: "Tu es Fiko Closer Elite."
        })
      });
      return await res.json();
    } catch (e) {
      console.error("[AIOmega] Insight failure", e);
      return null;
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
