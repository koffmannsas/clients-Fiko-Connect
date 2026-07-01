# PRODUCTION READINESS CHECKLIST - V6.0

## 1. Infrastructure
- [ ] Firebase Project ID: `krypton-ai-490214` verified.
- [ ] Environment Variables: All production keys loaded.
- [ ] Database: Firestore Indexes created for `leads` and `messages`.

## 2. Security
- [ ] WABA Webhook: HMAC verification active.
- [ ] Firestore Rules: V2 strict rules deployed.
- [ ] Secrets: Rotated and secured in GCP Secret Manager.

## 3. AI & WhatsApp
- [ ] DeepSeek: API credit loaded.
- [ ] Gemini: Vertex AI / API Key quota verified.
- [ ] Meta WABA: Phone ID and Access Token verified in Vault.

## 4. Monitoring
- [ ] Sentinel: Dashboard alerts active.
- [ ] Logging: Cloud Logging integration verified.
- [ ] Usage: Quota engine tracking confirmed.

## 5. Certification
- [ ] Zero Mock: 100% data live.
- [ ] Build: Stable and optimized.
- [ ] Final Audit: Pass.
