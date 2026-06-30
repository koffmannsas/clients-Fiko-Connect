import fs from 'fs';
import path from 'path';

export class CertificationIntegrityEngine {
    static validate(proofDir: string = 'runtime_proofs') {
        console.log("🛡️ [INTEGRITY] Validating Certification Evidence...");
        const artifacts = ['request.json', 'response.json', 'latency.json', 'proof.json'];
        const tests = fs.readdirSync(proofDir);

        let isValid = true;
        const results: any[] = [];

        for (const test of tests) {
            const testPath = path.join(proofDir, test);
            if (!fs.statSync(testPath).isDirectory()) continue;

            const missing = artifacts.filter(a => !fs.existsSync(path.join(testPath, a)));
            if (missing.length > 0) {
                console.error(`❌ [INTEGRITY] Test ${test} is missing artifacts: ${missing.join(', ')}`);
                isValid = false;
            }

            results.push({ test, artifacts: artifacts.length - missing.length, status: missing.length === 0 ? 'VALID' : 'CORRUPT' });
        }

        return { isValid, results };
    }
}
