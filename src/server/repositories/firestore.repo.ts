import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export class FirestoreRepo {
    static db() { return getFirestore(); }

    static async getCompany(companyId: string) {
        return (await this.db().collection('companies').doc(companyId).get()).data();
    }

    static async getVault(companyId: string) {
        return (await this.db().collection('vault').doc(companyId).get()).data();
    }

    static async syncLead(companyId: string, phone: string, text: string) {
        const leadRef = this.db().collection('leads').doc(`${companyId}_${phone}`);
        await leadRef.set({
            companyId, phone, lastMessage: text,
            updatedAt: FieldValue.serverTimestamp(),
            status: 'Lead'
        }, { merge: true });
    }
}
