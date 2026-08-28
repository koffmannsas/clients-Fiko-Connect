# ROLLBACK PROTOCOL

## BACKUP
Avant toute intervention, exécuter et sauvegarder les éléments suivants :
```bash
git rev-parse HEAD
# backup package-lock.json
# backup ecosystem
# backup server config
# backup Nginx config
```

## ROLLBACK CODE
Si la récupération échoue, restaurer le code à un état stable :
```bash
git reset --hard <KNOWN_GOOD_COMMIT>
npm install
npm run build
pm2 restart fiko-connect --update-env
```

## VALIDATION
Vérifier l'état de santé du rollback :
```bash
curl http://127.0.0.1:4000/health
curl https://connect-preprod.koffmann.group/health
```

## ROLLBACK EDGE
Recharger la configuration Nginx proxy :
```bash
nginx -t
systemctl reload nginx
```
