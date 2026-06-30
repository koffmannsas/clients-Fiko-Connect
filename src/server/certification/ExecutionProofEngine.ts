import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface ExecutionProof {
    timestamp: string;
    gitCommit: string;
    branch: string;
    durationMs: number;
    exitCode: number;
    logs: string;
    hash: string;
    status: 'PASS' | 'FAIL';
}

export class ExecutionProofEngine {
    private static PROOF_DIR = 'runtime_proofs';

    static async recordProof(testName: string, data: Partial<ExecutionProof>) {
        const targetDir = path.join(this.PROOF_DIR, testName);
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

        const proof: ExecutionProof = {
            timestamp: new Date().toISOString(),
            gitCommit: process.env.GIT_COMMIT || 'unknown',
            branch: process.env.GIT_BRANCH || 'main',
            durationMs: data.durationMs || 0,
            exitCode: data.exitCode ?? 0,
            logs: data.logs || '',
            status: data.status || 'FAIL',
            hash: ''
        };

        proof.hash = crypto.createHash('sha256').update(JSON.stringify(proof)).digest('hex');

        fs.writeFileSync(path.join(targetDir, 'proof.json'), JSON.stringify(proof, null, 2));
        return proof;
    }
}
