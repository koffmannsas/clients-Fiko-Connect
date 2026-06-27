/**
 * KCG CLOUD - GOLD MASTER MANIFEST GENERATOR
 */
import fs from 'fs';
import { execSync } from 'child_process';

function generateManifest() {
    console.log("📦 Generating Gold Master Manifest...");

    const manifest: any = {
        version: "5.0-phoenix-omega",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
        system: {
            node: process.version,
            platform: process.platform,
            arch: process.arch
        },
        infrastructure: {
            firebase_project: process.env.FIREBASE_PROJECT_ID || "krypton-ai-490214",
            port: process.env.PORT || 4000
        },
        certification: {}
    };

    try {
        if (fs.existsSync('verification.json')) {
            manifest.certification = JSON.parse(fs.readFileSync('verification.json', 'utf8'));
        }
    } catch (e) {}

    // Add build info if available
    try {
        if (fs.existsSync('dist/index.html')) {
            manifest.build = {
                status: "READY",
                hash: execSync('find dist -type f -exec md5sum {} + | md5sum').toString().trim().split(' ')[0]
            };
        }
    } catch (e) {}

    fs.writeFileSync('gold_master_manifest.json', JSON.stringify(manifest, null, 2));
    console.log("✅ Gold Master Manifest saved to gold_master_manifest.json");
}

generateManifest();
