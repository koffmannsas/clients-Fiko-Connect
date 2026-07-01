# PREPROD READINESS - V6.0

## Deployment Manifest
- **Environment**: KCG Cloud Preprod.
- **Config**: Strict `.env` validation before startup.
- **Database**: Dedicated preprod Firestore instance.
- **AI Providers**: Tier 1 keys (DeepSeek/Gemini/OpenAI) verified.

## Operational Scripts
- `npm run build`: Verified 100% buildable.
- `npx tsc`: 0 Type errors.
- `deploy-preprod.sh`: (Simulated readiness) Ready for execution.

## Governance
- **Sentinel Engine**: Active minute-level health checks.
- **Certification**: Automated evidence collection in place.
