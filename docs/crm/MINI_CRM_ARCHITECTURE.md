# FIKO CONNECT MINI CRM — ARCHITECTURE DOCUMENTATION

**Version:** V1.3.0
**Module:** Mini CRM Performance Engine
**Status:** **CERTIFIED**

---

## 1. System Overview

The Fiko Connect Mini CRM Performance Engine provides an integrated, multi-tenant sales pipeline and lead scoring interface embedded inside the SaaS client dashboard. It operates as an additive layer over the certified Fiko Connect OS V1.2.0 platform.

```text
                  ┌────────────────────────┐
                  │    SAAS DASHBOARD UI   │
                  │     (MiniCRM.tsx)      │
                  └───────────┬────────────┘
                              ↓
                  ┌────────────────────────┐
                  │   REST API (/api/crm)  │
                  │   requireTenantAuth    │
                  └───────────┬────────────┘
                              ↓
                  ┌────────────────────────┐
                  │     MINI CRM ENGINE    │
                  │  (MiniCRMService.ts)   │
                  └───────────┬────────────┘
                              ↓
                  ┌────────────────────────┐
                  │   FIRESTORE TENANT DB  │
                  │  (leads / companies)   │
                  └────────────────────────┘
```

---

## 2. Multi-Tenant Isolation & Security

- **Authentication Guard:** Every endpoint under `/api/crm/*` is protected by `requireTenantAuth` middleware using Firebase Admin Bearer token verification.
- **Fail-Closed Resolution:** Unauthenticated or cross-tenant query attempts return `401 UNAUTHORIZED` or `403 FORBIDDEN`.
- **Zero Global Fallback IDs:** Data is stored under `leads` matching `companyId`.
