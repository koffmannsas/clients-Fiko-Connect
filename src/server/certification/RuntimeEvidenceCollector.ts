import fs from 'fs';
import path from 'path';

export class RuntimeEvidenceCollector {
    private testDir: string;

    constructor(testName: string) {
        this.testDir = path.join('runtime_proofs', testName);
        if (!fs.existsSync(this.testDir)) fs.mkdirSync(this.testDir, { recursive: true });
    }

    collectRequest(data: any) {
        fs.writeFileSync(path.join(this.testDir, 'request.json'), JSON.stringify(data, null, 2));
    }

    collectResponse(data: any) {
        fs.writeFileSync(path.join(this.testDir, 'response.json'), JSON.stringify(data, null, 2));
    }

    collectLatency(ms: number) {
        fs.writeFileSync(path.join(this.testDir, 'latency.json'), JSON.stringify({ latency_ms: ms }, null, 2));
    }

    log(message: string) {
        fs.appendFileSync(path.join(this.testDir, 'logs.txt'), `[\${new Date().toISOString()}] \${message}\n`);
    }
}
