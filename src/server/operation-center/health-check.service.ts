import axios from 'axios';
import { FirestoreRepo } from '../repositories/firestore.repo';
import { FieldValue } from 'firebase-admin/firestore';
import { orchestrator } from '../../ai/orchestrator/ai-orchestrator';

export class HealthCheckService {
    static async performGlobalAudit() {
        const results: any = {
            timestamp: FieldValue.serverTimestamp(),
            api: await this.checkAPI(),
            firestore: await this.checkFirestore(),
            ai: await this.checkAI(),
            infra: await this.checkInfra()
        };

        results.overall = (results.api.status === 'UP' && results.firestore.status === 'UP' && results.ai.status === 'UP') ? 'HEALTHY' : 'DEGRADED';

        await FirestoreRepo.db().collection('kcg_health_audits').add(results);
        return results;
    }

    private static async checkAPI() {
        try {
            const start = Date.now();
            await axios.get('http://localhost:4000/health', { timeout: 2000 });
            return { status: 'UP', latency: Date.now() - start };
        } catch (e) { return { status: 'DOWN', error: (e as Error).message }; }
    }

    private static async checkFirestore() {
        try {
            const start = Date.now();
            await FirestoreRepo.db().collection('health_ping').doc('ping').set({ last: FieldValue.serverTimestamp() });
            return { status: 'UP', latency: Date.now() - start };
        } catch (e) { return { status: 'DOWN', error: (e as Error).message }; }
    }

    private static async checkAI() {
        try {
            const start = Date.now();
            const status = await orchestrator.getFullStatus();
            const anyUp = status.some(p => p.status === 'OK');
            return { status: anyUp ? 'UP' : 'DOWN', providers: status, latency: Date.now() - start };
        } catch (e) { return { status: 'DOWN', error: (e as Error).message }; }
    }

    private static async checkInfra() {
        const os = await import('os');
        return {
            load: os.loadavg(),
            freeMem: os.freemem(),
            totalMem: os.totalmem(),
            uptime: os.uptime()
        };
    }
}
