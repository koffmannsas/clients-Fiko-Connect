/**
 * KCG CLOUD - SERVER READINESS ENGINE
 * Robustly starts the server and waits for availability before certification.
 */
import { spawn } from 'child_process';
import axios from 'axios';

async function waitForServer(port: number = 4000, maxRetries: number = 30) {
    console.log(`🚀 Starting Phoenix Engine on port ${port}...`);

    // Kill existing process on port
    const killer = spawn('sh', ['-c', `kill $(lsof -t -i :${port}) 2>/dev/null || true`]);
    await new Promise(resolve => killer.on('close', resolve));

    const server = spawn('npx', ['tsx', 'server.ts'], {
        stdio: 'inherit',
        env: { ...process.env, PORT: port.toString() }
    });

    console.log(`⏱ Waiting for server readiness on http://localhost:${port}/health...`);

    for (let i = 0; i < maxRetries; i++) {
        try {
            const res = await axios.get(`http://localhost:${port}/health`, { timeout: 2000 });
            if (res.data.status === "ok") {
                console.log(`✅ SERVER READY: Version ${res.data.version}`);
                process.exit(0);
            }
        } catch (e) {
            process.stdout.write(".");
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.error("\n❌ SERVER_START_TIMEOUT: Phoenix engine failed to bind or respond.");
    server.kill();
    process.exit(1);
}

const PORT = parseInt(process.env.PORT || "4000");
waitForServer(PORT);
