import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

export class ExecutionProofEngine {
    static async generateProof(testName: string, request: any, response: any, status: 'PASS' | 'FAIL') {
        const proof = {
            testName,
            timestamp: new Date().toISOString(),
            status,
            request,
            response,
            nodeVersion: process.version,
            platform: process.platform
        };

        // 1. Immutable Audit Trail in Firestore
        const db = getFirestore();
        await db.collection('certification_proofs').add({
            ...proof,
            serverTimestamp: FieldValue.serverTimestamp()
        });

        // 2. Local Evidence File for CI/CD
        const proofDir = path.join(process.cwd(), 'runtime_proofs');
        if (!fs.existsSync(proofDir)) fs.mkdirSync(proofDir);

        const fileName = `proof_${testName.toLowerCase().replace(/ /g, '_')}_${Date.now()}.json`;
        fs.writeFileSync(path.join(proofDir, fileName), JSON.stringify(proof, null, 2));

        console.log(`[PROOF] Evidence generated: ${fileName}`);
    }
}
