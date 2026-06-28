import { AIService } from '../services/ai.service';
import { FirestoreRepo } from '../repositories/firestore.repo';
import { FieldValue } from 'firebase-admin/firestore';

export class BusinessWatchService {
    static async runScenarioWatch() {
        console.log("💼 [BUSINESS-WATCH] Starting Scenario Validation...");
        const companyId = "sentinel_watch_org";
        const scenarios = [
            { id: 'qualif', msg: "Je cherche une solution pour mes ventes WhatsApp." },
            { id: 'price', msg: "Combien coûte votre abonnement ?" }
        ];

        const results: any[] = [];

        for (const scene of scenarios) {
            const start = Date.now();
            try {
                const response = await AIService.generateResponse(companyId, `watch_${scene.id}`, scene.msg);
                results.push({
                    scenario: scene.id,
                    success: !!response,
                    latency: Date.now() - start,
                    responseLength: response.length
                });
            } catch (e: any) {
                results.push({ scenario: scene.id, success: false, error: e.message });
            }
        }

        await FirestoreRepo.db().collection('kcg_business_watch').add({
            timestamp: FieldValue.serverTimestamp(),
            results,
            status: results.every(r => r.success) ? 'PASS' : 'FAIL'
        });

        return results;
    }
}
