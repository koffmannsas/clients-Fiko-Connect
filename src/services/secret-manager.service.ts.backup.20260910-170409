import dotenv from 'dotenv';

dotenv.config();

export interface SecretCheckResult {
  key: string;
  status: 'PRESENT' | 'MISSING';
}

export async function getSecret(secretName: string): Promise<string | null> {
  // Check process.env first
  if (process.env[secretName]) {
    return process.env[secretName] || null;
  }
  return null;
}

export async function checkSecrets(keys: string[]): Promise<SecretCheckResult[]> {
  const results: SecretCheckResult[] = [];
  for (const key of keys) {
    const val = await getSecret(key);
    results.push({
      key,
      status: val ? 'PRESENT' : 'MISSING',
    });
  }
  return results;
}
