import axios from 'axios';
import { FirestoreRepo } from '../repositories/firestore.repo';
import { FieldValue } from 'firebase-admin/firestore';

export class WABAService {
    static async sendMessage(companyId: string, to: string, text: string) {
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
            return true;
        } catch (e) {
            console.error("[WABA] Send error:", e);
            return false;
        }
    }
}
