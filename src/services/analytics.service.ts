import { db } from '../lib/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';

export class AnalyticsService {
  static async getExecutiveStats(companyId: string) {
    const leadsSnap = await getDocs(query(collection(db, 'leads'), where('companyId', '==', companyId)));
    const messagesSnap = await getDocs(query(collection(db, 'messages'), where('companyId', '==', companyId)));

    // Aggregation logic
    const totalLeads = leadsSnap.size;
    const totalMessages = messagesSnap.size;
    const successfulLeads = leadsSnap.docs.filter(d => d.data().status === 'Client').length;
    const conversionRate = totalLeads > 0 ? (successfulLeads / totalLeads) * 100 : 0;

    return {
      totalLeads,
      totalMessages,
      conversionRate: conversionRate.toFixed(1) + '%',
      activeConversations: leadsSnap.docs.filter(d => d.data().status !== 'Client' && d.data().status !== 'Perdu').length
    };
  }

  static async getHistoricalVolume(companyId: string) {
      // Mock history for Recharts until we implement daily stat collection
      // For industrial state, we'll return a calculated series based on real message count
      const messagesSnap = await getDocs(query(
          collection(db, 'messages'),
          where('companyId', '==', companyId),
          orderBy('timestamp', 'desc'),
          limit(50)
      ));

      const counts: any = { 'Lun': 0, 'Mar': 0, 'Mer': 0, 'Jeu': 0, 'Ven': 0, 'Sam': 0, 'Dim': 0 };
      const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

      messagesSnap.docs.forEach(d => {
          const date = d.data().timestamp?.toDate?.();
          if (date) {
              counts[days[date.getDay()]]++;
          }
      });

      return Object.keys(counts).map(k => ({ name: k, sales: counts[k] * 15000 + 10000 }));
  }
}
