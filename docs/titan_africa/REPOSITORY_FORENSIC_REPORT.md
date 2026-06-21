# REPOSITORY FORENSIC REPORT

## 1. SHA Certification Status
- **Certified SHA:** `03272128338a6f45e6ac55f906f0c3ba226f0d7d` (Branch: `jules-1928427830883334417-a192e1eb`)
- **Current SHA (main):** `aaaf380492f42aae1b68dde3ea71c256f77b37ce` (pre-recovery)

## 2. Lost Files & Regressions
The following critical production components were missing or regressed on `main`:
- `src/ai/` (The entire AI Orchestration layer: Brain, Providers, Registry)
- `src/env-init.ts` (Priority environment bootstrap)
- `server.ts` (Regressed to legacy prototype without orchestrator and security)
- `package.json` (Regressed dependencies: missing `@google/generative-ai`, `firebase-admin`, etc.)
- `firestore.rules` (Security regressed to basic mode)

## 3. Conflicts Detected
- **server.ts:** `main` contained a simplified Express server with hardcoded Gemini calls and mock data. Certified version contained the production-grade engine with orchestrator.
- **Components:** `Leads.tsx` and `Conversations.tsx` on `main` used local state/mock data. Certified versions used reactive Firestore listeners.

## 4. Root Cause
Branch `main` was updated with a "feat: add notification icon and chat types" commit (`aaaf380`) which was based on an older, non-production state of the codebase, effectively performing a massive rollback of all certification-ready infrastructure.

## 5. Recovery Strategy
Perform an atomic restoration of the production backend (`src/ai`, `server.ts`, `src/env-init.ts`) and reactive frontend components. The UI features from the regression commit were manually preserved where possible.
