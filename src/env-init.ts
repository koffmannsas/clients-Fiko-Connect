import dotenv from 'dotenv';
import { loadAISecrets } from './services/secret-manager.service';

dotenv.config();

export async function bootstrapEnv() {
    await loadAISecrets();
}
