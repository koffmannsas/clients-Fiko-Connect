# ENVIRONMENT RECONCILIATION

Ce document classe et identifie les divergences entre le workspace d'audit local et la VM PREPROD réelle.
Classification obligatoire : `IDENTICAL`, `DIVERGENT`, `MISSING`, `STALE`, `UNKNOWN`.

**WORKSPACE JULES (/app) vs PREPROD (/opt/kcg/preprod/Fiko-Connect)**

- **Git HEAD:** DIVERGENT (Local: `d31da77` vs Remote: `15b6bbf`)
- **Branch:** DIVERGENT (Local: `jules-*` vs Remote: `rc/jules-v5`)
- **package.json:** DIVERGENT
- **package-lock.json:** DIVERGENT
- **server.ts:** DIVERGENT
- **src/:** DIVERGENT (Local missing V5 architecture like `src/server/routes/*`)
- **dist/:** UNKNOWN
- **ecosystem:** DIVERGENT / MISSING
- **environment variables:** MISSING
- **Firebase project:** MISSING
- **API routes:** DIVERGENT (Local missing `/api/auth`, `/api/waba`)
