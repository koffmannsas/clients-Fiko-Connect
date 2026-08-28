# PREPROD RECOVERY RUNBOOK

Procédure déterministe pour restaurer la PREPROD sur la VM.

## PHASE 0 — IDENTIFICATION VM
Exécuter sur le terminal distant :
```bash
hostname
hostname -I
gcloud config get-value project
gcloud compute instances describe kcg-preprod --zone us-central1-b
```

## PHASE 1 — CODE
```bash
cd /opt/kcg/preprod/Fiko-Connect
git status
git branch --show-current
git rev-parse HEAD
git log -10 --oneline
```
*IMPORTANT:* Si le repository appartient à `koffmannsas` et que l'opérateur est `cmo`, utiliser explicitement :
`sudo -u koffmannsas git -C /opt/kcg/preprod/Fiko-Connect ...`
Ne jamais contourner les permissions Git par modification arbitraire du propriétaire du repository.

## PHASE 2 — DEPENDENCIES
```bash
npm install
npm run lint
npm run build
```
Toute erreur doit être documentée.

## PHASE 3 — RUNTIME
Identifier exactement le processus qui écoute le port 4000 :
```bash
sudo ss -ltnp | grep :4000
```
Identifier son PID :
```bash
sudo lsof -nP -iTCP:4000 -sTCP:LISTEN
```
Identifier son CWD :
```bash
sudo readlink -f /proc/<PID>/cwd
```
Identifier sa commande :
```bash
sudo tr '\0' ' ' < /proc/<PID>/cmdline
```
Le processus DOIT provenir du checkout PREPROD attendu.

## PHASE 4 — PM2
```bash
pm2 list
pm2 describe fiko-connect
pm2 env <id>
```
Vérifier : script path, script args, cwd, NODE_ENV, port, restarts, uptime.

## PHASE 5 — HEALTH
```bash
curl -sS -i http://127.0.0.1:4000/health
curl -sS -i https://connect-preprod.koffmann.group/health
```
Les deux doivent retourner HTTP 200.

## PHASE 6 — EDGE
```bash
nginx -t
nginx -T
```
Vérifier que `connect-preprod.koffmann.group` pointe vers la VM PREPROD et que Nginx proxy vers `127.0.0.1:4000`.

## PHASE 7 — FRONTEND
Vérifier `dist/index.html` et `dist/assets/*`.
Vérifier que le bundle servi correspond au build actuellement présent sur la VM.

## PHASE 8 — FIREBASE
Vérifier l'accès au projet `krypton-ai-490214`. Tester Firestore sans afficher de données sensibles.

## PHASE 9 — API
Tester les routes avec des données de test contrôlées :
- `GET /health`
- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`
- `POST /api/waba/connect`
- `GET /api/webhooks/meta`

## PHASE 10 — WABA
NE PAS déclarer WABA opérationnel simplement parce que le code existe. Exiger un test réel :
1. Fiko → API → WABA → WhatsApp → téléphone réel
2. WhatsApp → webhook → Fiko → AI → WhatsApp
