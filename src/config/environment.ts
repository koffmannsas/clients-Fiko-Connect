import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '4000', 10),
    FIREBASE_PROJECT_ID: "krypton-ai-490214", // Forced industrial consistency

    WABA: {
        APP_SECRET: process.env.WHATSAPP_APP_SECRET || '',
        VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN || '',
        ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN || ''
    },

    AI: {
        DEEPSEEK_KEY: process.env.DEEPSEEK_API_KEY || '',
        GEMINI_KEY: process.env.GOOGLE_GEMINI_API_KEY || '',
        OPENAI_KEY: process.env.OPENAI_API_KEY || ''
    },

    IS_PRODUCTION: process.env.NODE_ENV === 'production'
};

const missing = [];
if (!ENV.WABA.APP_SECRET) missing.push('WHATSAPP_APP_SECRET');
if (!ENV.WABA.VERIFY_TOKEN) missing.push('WHATSAPP_VERIFY_TOKEN');

if (missing.length > 0 && ENV.IS_PRODUCTION) {
    throw new Error(`CRITICAL: Missing required production environment variables: ${missing.join(', ')}`);
}
