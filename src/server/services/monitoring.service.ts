import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export class MonitoringService {
    static async logEvent(level: 'INFO' | 'WARN' | 'ERROR', module: string, message: string, meta: any = {}) {
        console.log(`[${level}] [${module}] ${message}`, meta);

        try {
            const db = getFirestore();
            await db.collection('audit_trail').add({
                level,
                module,
                message,
                meta,
                timestamp: FieldValue.serverTimestamp()
            });
        } catch (e) {
            console.error("Critical: Monitoring failure", e);
        }
    }

    static async trackTokenUsage(companyId: string, provider: string, tokens: number) {
        const db = getFirestore();
        await db.collection('token_usage').add({
            companyId,
            provider,
            tokens,
            timestamp: FieldValue.serverTimestamp()
        });
    }
}
