import axios from 'axios';
import { FirestoreRepo } from '../repositories/firestore.repo';
import { FieldValue } from 'firebase-admin/firestore';

export class WABAService {
    static async sendMessage(companyId: string, to: string, text: string) {
        // --- QUOTA CHECK ---
        const subSnap = await FirestoreRepo.db().collection('subscriptions').doc(companyId).get();
        if (subSnap.exists) {
            const sub = subSnap.data();
            if ((sub?.messagesSent || 0) >= (sub?.maxMessages || 100)) {
                console.warn(`[WABA] Quota exceeded for company: ${companyId}`);
                return false;
            }
        }

        const vault = await FirestoreRepo.getVault(companyId);
        const company = await FirestoreRepo.getCompany(companyId);

        const token = vault?.wabaToken;
        const phoneId = company?.waba?.phoneNumberId;

        if (!token || !phoneId) return false;

        try {
            const res = await axios.post(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
                messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { body: text }
            }, { headers: { Authorization: `Bearer ${token}` } });

            await FirestoreRepo.db().collection('messages').add({
                companyId, to, text, direction: 'OUTBOUND',
                wa_id: res.data.messages[0].id,
                timestamp: FieldValue.serverTimestamp()
            });

            // Increment usage
            await FirestoreRepo.recordUsage(companyId, text.length / 4); // Estimating tokens roughly

            return true;
        } catch (e) {
            console.error("[WABA] Send error:", e);
            return false;
        }
    }
}
