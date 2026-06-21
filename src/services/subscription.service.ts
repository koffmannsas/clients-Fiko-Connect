import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';

export interface SubscriptionData {
  plan: 'free' | 'starter' | 'business' | 'enterprise';
  trialActive: boolean;
  trialExpiresAt: any;
  messagesSent: number;
  maxMessages: number;
}

export class SubscriptionService {
  static listenToSubscription(companyId: string, callback: (data: SubscriptionData) => void) {
    return onSnapshot(doc(db, 'subscriptions', companyId), (snap) => {
      if (snap.exists()) {
        callback(snap.data() as SubscriptionData);
      }
    });
  }

  static async checkLimit(companyId: string, type: 'messages' | 'aiMessages'): Promise<boolean> {
    const snap = await getDoc(doc(db, 'subscriptions', companyId));
    if (!snap.exists()) return false;
    const data = snap.data();
    if (data.plan === 'enterprise') return true;
    return (data[type] || 0) < (data.maxMessages || 1000);
  }
}
