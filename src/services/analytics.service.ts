import { db } from '../lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

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
}
