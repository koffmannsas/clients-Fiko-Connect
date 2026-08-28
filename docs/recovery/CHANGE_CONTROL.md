# CHANGE CONTROL

Règles strictes de contrôle des modifications sur l'environnement PREPROD :

1. Aucun changement directement en PREPROD sans backup.
2. Aucun changement sans identifier le HEAD actuel.
3. Aucun changement sans identifier le processus runtime.
4. Aucun changement sans test health.
5. Aucun changement sans rollback possible.
6. Aucun secret dans Git.
7. Aucun token dans les rapports.
8. Aucun "certified" sans preuve runtime.
9. Aucun changement du DNS sans validation.
10. Aucun changement WABA sans test Meta réel.
