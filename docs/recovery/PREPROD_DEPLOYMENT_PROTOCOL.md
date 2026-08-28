# PREPROD DEPLOYMENT PROTOCOL

Ce protocole définit les règles de déploiement et de mise à jour pour l'environnement PREPROD.

## RULES
1. Le code doit être déployé exclusivement sur `/opt/kcg/preprod/Fiko-Connect`.
2. Le processus de dépendance doit être figé (utilisation de `npm ci` ou `npm install` avec verrouillage).
3. PM2 doit être relancé en utilisant explicitement la configuration prévue (éviter les conflits entre `ecosystem.config.cjs` et `scripts/industrial/pm2-config.cjs`).
4. Toute modification doit respecter le `CHANGE_CONTROL.md`.
