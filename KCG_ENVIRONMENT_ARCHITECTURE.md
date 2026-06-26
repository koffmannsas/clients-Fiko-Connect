# KCG ENVIRONMENT ARCHITECTURE™ — OPÉRATION PHOENIX

## 1. Environment Definitions

### A. Preproduction (`kcg-preprod`)
- **Role**: Integration, QA, Certification.
- **VM**: Dedicated `kcg-preprod` Compute Instance.
- **WABA**: Connected to Meta Test Number.
- **Firestore**: Dedicated staging project (`kcg-staging`).
- **Access**: Restricted to Internal Team & Jules.

### B. Production (`kcg-platform`)
- **Role**: Live Commercial Operations.
- **VM**: Sacred `kcg-platform` Instance.
- **WABA**: Official Business Number.
- **Firestore**: Production project (`krypton-ai-490214`).
- **Access**: Zero development. No direct SSH edits.

## 2. Resource Mapping
| Feature | Preprod (v5.0-rc) | Production (v5.0-certified) |
| :--- | :--- | :--- |
| **Port** | 4001 | 4000 |
| **Branch** | `develop` | `main` |
| **Auth** | Staging Keys | Prod Keys |
| **AI** | Rate Limited | High Throughput |

## 3. Environment Switch Logic
Implemented via `NODE_ENV` and `CERTIFICATION` flags in `env-init.ts`.

**VERDICT: DESIGN FINALIZED. READY FOR PIPELINE CONSTRUCTION.**
