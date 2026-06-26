# DEPLOYMENT PIPELINE CERTIFICATION — KCG INDUSTRIAL

## 1. Pipeline Flow
1. [DEV] -> Push to develop branch
2. [PREPROD] -> deploy-preprod.sh trigger
3. [QA] -> Functional Verification
4. [CERTIFICATION] -> CTO Sign-off
5. [PROD] -> deploy-prod.sh (Traffic Shift)

## 2. Certification Gates
- **G0 (Build)**: Must pass `npm run build` without errors.
- **G1 (Lint)**: Must pass `npm run lint` and Type Check.
- **G2 (Auth)**: Verify WABA and OTP connectivity on Staging.
- **G3 (AI)**: Verify DeepSeek/Gemini failover.

## 3. Rollback Protocol
Implemented in `rollback.sh`:
1. Identify previous stable build.
2. PM2 switch to previous version.
3. Health check validation.

**VERDICT: PIPELINE CERTIFIED. READY FOR GIT GOVERNANCE.**
