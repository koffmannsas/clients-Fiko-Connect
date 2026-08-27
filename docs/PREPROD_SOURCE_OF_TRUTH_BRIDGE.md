# PREPROD SOURCE OF TRUTH BRIDGE

## 1. Jules Workspace

Path:
/app

HEAD:
d31da77

Branch:
jules-7625689031435941494-4ccc9f35

## 2. PREPROD Runtime

Host:
kcg-platform-prod

Path:
/opt/kcg/preprod/Fiko-Connect

Branch:
rc/jules-v5

HEAD:
15b6bbf

## 3. Critical Divergence

Le sandbox local Jules actuel (`/app`, commit `d31da77`) **NE CONTIENT PAS** la V5 Phoenix complète qui a été auditee et certifiée sur la machine de PREPROD.
Toutes les analyses de code WABA, webhooks, et authentification réalisées dans la sandbox sont obsolètes ou simplifiées par rapport à la réalité du runtime VM PREPROD.

## 4. Verified PREPROD Components

Les fichiers suivants sont confirmés existants et fonctionnels sur le chemin de vérité (`/opt/kcg/preprod/Fiko-Connect`), mais n'existent pas ou divergent dans le sandbox local :
- `server.ts`
- `src/server/services/waba.service.ts`
- `src/server/routes/auth.routes.ts`
- `src/server/routes/waba.routes.ts`
- `src/server/routes/webhooks.routes.ts`
- `src/server/repositories/firestore.repo.ts` (ou equivalent)
- `scripts/industrial/pm2-config.cjs`
- `scripts/industrial/nginx-proxy.conf`

## 5. Verified Runtime

Sur la VM PREPROD, le processus backend :
- Écoute sur le PORT `4000`.
- L'appel HTTP `GET /health` répond HTTP 200 avec le payload certifié :
  ```json
  {
    "status": "ok",
    "version": "5.0-phoenix"
  }
  ```

## 6. Known Current Blocker

La configuration système WABA auditée sur la PREPROD révèle que les documents suivants sont **ABSENTS** de la base Firestore de production :
- `companies/fiko_system_master`
- `vault/fiko_system_master`

Conséquence métier sur le `WABAService` (V5) :
La fonction d'envoi échoue et retourne `false` en raison de l'absence du `wabaToken` ou du `phoneNumberId`.
Cela explique les résultats `delivered: false` observés sur le endpoint OTP `/api/auth/send-otp`.
