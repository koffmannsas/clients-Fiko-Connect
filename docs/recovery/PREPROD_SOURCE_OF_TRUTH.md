# PREPROD SOURCE OF TRUTH

Ce document définit officiellement les sources de vérité pour l'environnement PREPROD Fiko Connect.
Le workspace de développement local (`/app`) NE DOIT PAS être considéré comme une source de vérité runtime.

## SOURCE OF TRUTH #1 — RUNTIME PREPROD
- **VM:** kcg-preprod
- **Projet GCP:** krypton-ai-490214
- **Zone:** us-central1-b
- **Checkout attendu:** `/opt/kcg/preprod/Fiko-Connect`
- **Domaine PREPROD:** `https://connect-preprod.koffmann.group`
- **Backend attendu:** `127.0.0.1:4000`

## SOURCE OF TRUTH #2 — CODE
Le code réellement exécuté sur PREPROD est celui présent dans :
`/opt/kcg/preprod/Fiko-Connect`

## SOURCE OF TRUTH #3 — PROCESS MANAGER
PM2 sur la VM PREPROD.

## SOURCE OF TRUTH #4 — EDGE
Nginx + DNS + certificat TLS.

## SOURCE OF TRUTH #5 — DATA
Firebase / Firestore du projet :
`krypton-ai-490214`

## SOURCE OF TRUTH #6 — EXTERNAL INTEGRATIONS
Meta Graph API / WhatsApp Business Platform.

---

## ÉTAT DE LA VM PREPROD
*(À remplir via inspection sur la VM, aucun secret ne doit être affiché en clair)*

### SYSTEM
- **VM hostname:** UNKNOWN
- **GCP project:** UNKNOWN
- **Zone:** UNKNOWN
- **Internal IP:** UNKNOWN
- **External IP:** UNKNOWN
- **OS:** UNKNOWN
- **Node version:** UNKNOWN
- **npm version:** UNKNOWN
- **PM2 version:** UNKNOWN

### APPLICATION
- **Absolute checkout path:** UNKNOWN
- **Git branch:** UNKNOWN
- **Git HEAD:** UNKNOWN
- **Working tree status:** UNKNOWN
- **package.json:** UNKNOWN
- **package-lock.json:** UNKNOWN
- **server.ts:** UNKNOWN
- **dist/:** UNKNOWN
- **Ecosystem configuration:** UNKNOWN

### RUNTIME
- **PM2 process:** UNKNOWN
- **PID:** UNKNOWN
- **Uptime:** UNKNOWN
- **Restart count:** UNKNOWN
- **Port:** UNKNOWN
- **NODE_ENV:** UNKNOWN
- **Health endpoint:** UNKNOWN

### EDGE
- **DNS:** UNKNOWN
- **Nginx server_name:** UNKNOWN
- **Proxy_pass:** UNKNOWN
- **TLS certificate:** UNKNOWN
- **HTTPS endpoint:** UNKNOWN

### DATA
- **Firebase project:** UNKNOWN
- **Firestore availability:** UNKNOWN
- **Required collections:** UNKNOWN

### WABA
- **Meta configuration:** UNKNOWN
- **Phone Number ID:** UNKNOWN
- **Business Account ID:** UNKNOWN
- **Credential presence:** UNKNOWN
- **Webhook configuration:** UNKNOWN
