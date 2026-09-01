import dotenv from 'dotenv';
import { checkSecrets } from './services/secret-manager.service';

dotenv.config();

let isBootstrapped = false;

export async function bootstrapEnv(): Promise<void> {
  if (isBootstrapped) return;

  console.log('[ENV INIT] Initializing environment & credentials bootstrap...');

  const requiredKeys = [
    'GEMINI_API_KEY',
    'DEEPSEEK_API_KEY',
    'OPENAI_API_KEY',
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_PHONE_NUMBER_ID',
    'WHATSAPP_VERIFY_TOKEN',
    'WHATSAPP_APP_SECRET'
  ];

  const checks = await checkSecrets(requiredKeys);

  for (const check of checks) {
    console.log(`[ENV INIT] Secret ${check.key}: ${check.status}`);
  }

  isBootstrapped = true;
  console.log('[ENV INIT] Environment bootstrap completed.');
}
