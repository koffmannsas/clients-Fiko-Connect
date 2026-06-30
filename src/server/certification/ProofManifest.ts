import fs from 'fs';

export class ProofManifest {
    static generate(version: string) {
        const manifest = {
            version,
            timestamp: new Date().toISOString(),
            git: {
                commit: process.env.GIT_COMMIT || 'HEAD',
                branch: process.env.GIT_BRANCH || 'main'
            },
            proofs: this.collectProofs()
        };

        fs.writeFileSync('ProofManifest.json', JSON.stringify(manifest, null, 2));
        return manifest;
    }

    private static collectProofs() {
        const dir = 'runtime_proofs';
        if (!fs.existsSync(dir)) return [];
        return fs.readdirSync(dir).map(test => {
            const proofPath = `\${dir}/\${test}/proof.json`;
            return fs.existsSync(proofPath) ? JSON.parse(fs.readFileSync(proofPath, 'utf8')) : null;
        }).filter(Boolean);
    }
}
