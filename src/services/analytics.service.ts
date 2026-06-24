import { db } from '../lib/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';

export class AnalyticsService {
  static async getExecutiveStats(companyId: string) {
    try {
      const leadsRef = collection(db, 'leads');
      const q = query(leadsRef, where('companyId', '==', companyId));
      const snap = await getDocs(q);
      const leads = snap.docs.map(d => d.data());
      const converted = leads.filter(l => l.status === 'Customer' || l.status === 'Won').length;
      const pipelineValue = leads.reduce((acc, curr) => acc + (curr.estimatedValue || 0), 0);
      return { totalLeads: leads.length, conversionRate: leads.length > 0 ? Math.round((converted / leads.length) * 100) : 0, pipelineValue, activeConversations: leads.length, totalMessages: leads.length * 5 };
    } catch (e) { return { totalLeads: 0, conversionRate: 0, pipelineValue: 0, activeConversations: 0, totalMessages: 0 }; }
  }

  static async getKnowledgeMetrics(companyId: string) {
    try {
        const res = await fetch(`/api/knowledge/score/${companyId}`);
        const data = await res.json();
        return { count: data.totalFacts || 0, mastery: data.score || 0 };
    } catch (e) { return { count: 0, mastery: 0 }; }
  }

  static async getMarketInsights() {
    try {
      const res = await fetch('/api/market-insights');
      return await res.json();
    } catch (e) { return []; }
  }

  static async getHistoricalVolume() {
      return [{n: 'L', v: 400}, {n: 'M', v: 300}, {n: 'M', v: 600}, {n: 'J', v: 800}, {n: 'V', v: 500}];
  }

  static async getPaymentStats(companyId: string) {
    const txSnap = await getDocs(query(collection(db, 'transactions'), where('companyId', '==', companyId)));
    const txs = txSnap.docs.map(d => d.data());
    const total = txs.filter(t => t.status === 'SUCCESS').reduce((acc, curr) => acc + (curr.amount || 0), 0);
    return { totalRevenue: total, fees: total * 0.01, net: total * 0.99, transactions: txs };
  }
}
