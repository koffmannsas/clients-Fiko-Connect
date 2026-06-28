import { MonitoringService } from "../../services/monitoring.service";
import { FirestoreRepo } from "../repositories/firestore.repo";
import { HealthCheckService } from "./health-check.service";
import { RegressionService } from "./regression.service";
import { BusinessWatchService } from "./business-watch.service";
import { FieldValue } from 'firebase-admin/firestore';

export class SentinelEngine {
    private static healthInterval: NodeJS.Timeout | null = null;
    private static certInterval: NodeJS.Timeout | null = null;
    private static watchInterval: NodeJS.Timeout | null = null;

    static start() {
        console.log("🛡️ [SENTINEL] Operation Sentinel Engine Active");

        this.healthInterval = setInterval(() => this.runHealthCycle(), 60000);
        this.runHealthCycle();

        this.certInterval = setInterval(() => this.runCertificationCycle(), 3600000);
        setTimeout(() => this.runCertificationCycle(), 30000);

        this.watchInterval = setInterval(() => this.runWatchCycle(), 3600000);
        setTimeout(() => this.runWatchCycle(), 60000);
    }

    static async runHealthCycle() {
        console.log(`⏱️ [SENTINEL] Starting Audit Cycle: ${new Date().toISOString()}`);
        try {
            const audit = await HealthCheckService.performGlobalAudit();
            if (audit.overall !== 'HEALTHY') {
                await FirestoreRepo.db().collection('kcg_incidents').add({
                    type: 'HEALTH_DEGRADED',
                    details: audit,
                    timestamp: FieldValue.serverTimestamp()
                });
            }
        } catch (e) {
            console.error("❌ [SENTINEL] Health Cycle Failure", e);
        }
    }

    static async runCertificationCycle() {
        console.log(`🔍 [SENTINEL] Starting Certification Cycle: ${new Date().toISOString()}`);
        try {
            const report = await RegressionService.runLiveCertification();
            if (report.regressionDetected) {
                await FirestoreRepo.db().collection('kcg_incidents').add({
                    type: 'REGRESSION_DETECTED',
                    details: report,
                    timestamp: FieldValue.serverTimestamp()
                });
            }
        } catch (e) {
            console.error("❌ [SENTINEL] Certification Cycle Failure", e);
        }
    }

    static async runWatchCycle() {
        console.log(`💼 [SENTINEL] Starting Business Watch Cycle: ${new Date().toISOString()}`);
        try {
            await BusinessWatchService.runScenarioWatch();
        } catch (e) {
            console.error("❌ [SENTINEL] Watch Cycle Failure", e);
        }
    }

    static stop() {
        if (this.healthInterval) clearInterval(this.healthInterval);
        if (this.certInterval) clearInterval(this.certInterval);
        if (this.watchInterval) clearInterval(this.watchInterval);
    }
}
