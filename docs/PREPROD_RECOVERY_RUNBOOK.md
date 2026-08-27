# PREPROD RECOVERY RUNBOOK

Ce runbook liste les étapes obligatoires pour restaurer, valider et certifier l'environnement PREPROD réel sur la VM.
**Toutes ces étapes portent la mention [REMOTE EXECUTION REQUIRED].**

## PHASE A — Git / filesystem reconciliation
- Vérifier le répertoire `/opt/kcg/preprod/Fiko-Connect`.
- S'assurer que le repository git est sur la branche `rc/jules-v5` au commit `15b6bbf` (ou un commit de récupération validé).

## PHASE B — dependency installation
- Exécuter `npm ci` pour installer proprement les dépendances bloquées par le package-lock.json (Phoenix V5).

## PHASE C — TypeScript validation
- Compiler et vérifier le typage global avec `npm run lint` ou `tsc --noEmit`.

## PHASE D — production build
- Construire le frontend via `npm run build` et vérifier le dossier `/dist`.

## PHASE E — PM2 clean startup
- Nettoyer les anciens processus: `pm2 delete all`
- Tuer tout processus orphelin: `sudo ss -ltnp | grep :4000` -> `kill -9 <PID>`
- Démarrer strictement avec le fichier V5: `pm2 start scripts/industrial/pm2-config.cjs --env production`

## PHASE F — localhost health
- Vérifier que l'API est saine localement :
  `curl -s http://127.0.0.1:4000/health` (doit retourner HTTP 200 `5.0-phoenix`).

## PHASE G — nginx routing
- Valider la configuration NGINX : `nginx -t`
- S'assurer que le domaine pointe vers `127.0.0.1:4000`.

## PHASE H — HTTPS domain
- Effectuer des tests de résolution sur le domaine public :
  `curl -I https://connect-preprod.koffmann.group`

## PHASE I — Firebase Admin connectivity
- S'assurer que l'accès Cloud Firestore via Node `firebase-admin` (applicationDefault) est fonctionnel (lecture de configurations de base).

## PHASE J — WABA system configuration
- Restaurer les credentials Meta dans la Vault Firestore :
  - Créer `companies/fiko_system_master`
  - Créer `vault/fiko_system_master` (avec `wabaToken`, `phoneNumberId`, etc.) sans exposer ces valeurs en clair.

## PHASE K — Meta API token validation
- Utiliser cURL pour s'authentifier au Meta Graph API (depuis la VM) et s'assurer que le Token et Phone ID sont actifs et valides.

## PHASE L — OTP real delivery
- Appeler `POST /api/auth/send-otp` avec un numéro de test réel.
- Vérifier la réception *physique* du message WhatsApp OTP.

## PHASE M — signup
- Finaliser le flux de création de compte via la validation de l'OTP `POST /api/auth/verify-otp`.

## PHASE N — 7-day trial
- Vérifier l'activation d'un abonnement de type "trial" dans Firestore.

## PHASE O — WABA onboarding
- Lier l'API WABA Business du client avec le compte via les endpoints V5 de connexion (`POST /api/waba/connect`).

## PHASE P — webhook verification
- Configurer Meta pour utiliser le Webhook de PREPROD.
- Valider l'intégrité du challenge `GET /api/webhook`.

## PHASE Q — inbound WhatsApp message
- Envoyer un message WhatsApp depuis un appareil client vers le WABA du compte PREPROD.
- Valider la réception sur la VM (`POST /api/webhook`).

## PHASE R — AI response
- Valider le traitement de la réponse par le moteur d'orchestration AI V5 (DeepSeek/Gemini).

## PHASE S — outbound WhatsApp response
- Vérifier que l'IA émet la réponse à Meta.

## PHASE T — persistence / CRM / memory
- Confirmer que la conversation (input/output) est enregistrée dans `fiko_memory`, `leads`, et `messages`.

## PHASE U — chaos/failover
- Éteindre/relancer PM2 et vérifier que les messages ne sont pas perdus (idempotence).

## PHASE V — production readiness gate
- Scorer l'environnement. S'il répond aux normes industrielles 90/100, la PREPROD est "CERTIFIED".
