import { db } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export class BillingService {
  static async createSubscription(companyId: string, plan: string) {
    console.log(`[BILLING] Initiating ${plan} for ${companyId}`);
    // Skeleton for Paystack/Stripe integration
    return { checkoutUrl: "https://pay.fiko.ci/checkout" };
  }

  static async upgradePlan(companyId: string, plan: string) {
    await updateDoc(doc(db, 'subscriptions', companyId), {
      plan,
      updatedAt: serverTimestamp(),
      trialActive: false
    });
  }
}
