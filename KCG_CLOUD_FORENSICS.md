# KCG CLOUD FORENSICS™ — OPERATION PHOENIX

## 1. System Inventory
- **Platform**: GCP (Google Cloud Platform)
- **Primary VM**: `kcg-platform`
- **Containerization**: PM2 Process Manager
- **Web Server**: Nginx (Reverse Proxy)
- **SSL**: Let's Encrypt (Certbot)

## 2. Infrastructure Stack
- **Backend**: Node.js / Express (Modular Phoenix Architecture)
- **Frontend**: React 19 / Vite 6 / Tailwind v4
- **Database**: Firestore (Native Mode)
- **Auth**: Firebase Auth (Custom Tokens)
- **Ports**:
  - Production: 4000
  - Staging: 4001

## 3. Network & Security
- **Firewall**: Port 80, 443, 4000, 4001 open.
- **DNS**: Managed via external provider (linked to GCP Static IPs).
- **Secrets**: Handled via `.env` and `vault` Firestore collection.

## 4. Risks & Findings
- **Single Point of Failure**: Lack of automated VM snapshots.
- **Git Flow**: Direct merges to `main` possible.
- **Modularity**: Recently refactored, but needs strict environment separation.

**VERDICT: INFRASTRUCTURE MAPPED. READY FOR ENVIRONMENT DESIGN.**
