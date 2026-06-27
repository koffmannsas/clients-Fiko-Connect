/**
 * KCG CLOUD - ENVIRONMENT ABSTRACTION
 * Auto-detects the execution context to adapt industrial validation.
 */

export enum EnvType {
    LOCAL = "LOCAL",
    SANDBOX = "SANDBOX",
    CI = "CI",
    PRODUCTION = "PRODUCTION",
    GOOGLE_CLOUD = "GCP"
}

export class Environment {
    static get type(): EnvType {
        if (process.env.KCG_CONTEXT === "sandbox" || process.env.USER === "root") return EnvType.SANDBOX;
        if (process.env.GITHUB_ACTIONS || process.env.CI) return EnvType.CI;
        if (process.env.NODE_ENV === "production") return EnvType.PRODUCTION;
        if (process.env.GOOGLE_CLOUD_PROJECT) return EnvType.GOOGLE_CLOUD;
        return EnvType.LOCAL;
    }

    static get isSandbox(): boolean { return this.type === EnvType.SANDBOX; }
    static get isCI(): boolean { return this.type === EnvType.CI; }
    static get isProduction(): boolean { return this.type === EnvType.PRODUCTION; }

    static get supportsNetwork(): boolean {
        // Sandboxes might have restricted outbound or localhost-only
        return true;
    }

    static get supportsWebhook(): boolean {
        // Only prod/staging usually has a public URL for Meta
        return this.isProduction;
    }

    static get supportsFirestore(): boolean {
        return !!process.env.FIREBASE_PROJECT_ID;
    }

    static get metadata() {
        return {
            type: this.type,
            isSandbox: this.isSandbox,
            isCI: this.isCI,
            isProduction: this.isProduction,
            capabilities: {
                network: this.supportsNetwork,
                webhook: this.supportsWebhook,
                firestore: this.supportsFirestore
            },
            timestamp: new Date().toISOString()
        };
    }
}
