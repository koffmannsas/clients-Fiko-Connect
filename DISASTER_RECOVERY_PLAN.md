# DISASTER RECOVERY PLAN (DRP) — KCG INDUSTRIAL

## 1. Scenario Protocols

### Scenario A: VM Destruction
- **Action**: Provision new GCP Compute Instance.
- **Recovery**: Restore from latest snapshot. Re-apply Nginx and PM2 configurations.

### Scenario B: Firestore Data Loss
- **Action**: Halt traffic to prevent corruption.
- **Recovery**: Import latest GCS export. Restore PITR (Point-in-time recovery) if available.

### Scenario C: Critical Build Regression
- **Action**: Trigger `rollback.sh`.
- **Recovery**: Switch PM2 back to the previous stable artifact.

## 2. Infrastructure Resilience
- **Failover**: Multi-provider AI orchestrator ensures responses even if one LLM provider is down.
- **WABA Persistence**: Raw events stored in `webhook_events` allow for manual reprocessing if the ingestion pipeline fails.

## 3. Contact Matrix
- **Technical Lead**: Jules (CTO)
- **Support**: GCP / Firebase Cloud Console

**VERDICT: RECOVERY PROCEDURES CODIFIED.**
