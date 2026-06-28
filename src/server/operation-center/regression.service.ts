import { execSync } from 'child_process';
import fs from 'fs';
import { FirestoreRepo } from '../repositories/firestore.repo';
import { FieldValue } from 'firebase-admin/firestore';

export class RegressionService {
    static async runLiveCertification() {
        console.log("🛠️ [REGRESSION] Starting Live Certification (Hourly)...");
        try {
            // Trigger the existing Gold Master validation script
            execSync('bash verify_gold_master.sh FULL', { stdio: 'inherit' });

            const verifyData = JSON.parse(fs.readFileSync('verification.json', 'utf8'));
            const manifest = JSON.parse(fs.readFileSync('gold_master_manifest.json', 'utf8'));

            const report: any = {
                timestamp: FieldValue.serverTimestamp(),
                mode: verifyData.mode,
                errors: verifyData.errors,
                status: verifyData.status,
                regressionDetected: false,
                diff: []
            };

            // Simple Regression Check: Did error count increase compared to Gold Master?
            if (verifyData.errors > (manifest.certification?.errors || 0)) {
                report.regressionDetected = true;
                report.diff.push(`Error count increased: ${verifyData.errors} vs ${manifest.certification?.errors}`);
            }

            await FirestoreRepo.db().collection('kcg_regressions').add(report);
            console.log(`✅ [REGRESSION] Certification complete. Status: ${report.status}`);
            return report;
        } catch (e: any) {
            console.error("❌ [REGRESSION] Certification Failure", e.message);
            return { status: 'FAILED', error: e.message };
        }
    }
}
