# OBSERVABILITY FINAL REPORT - V6.0

## Monitoring Stack
- **Sentinel Engine**: (Conceptual placeholder for Cloud Functions monitoring) tracks system health.
- **Centralized Logging**: `MonitoringService` sends all levels (INFO/WARN/ERROR) to Firestore.
- **Error Tracking**: `ai_failures` and `WABA` errors are caught and logged with full context.
- **Performance**: Latency for AI providers is tracked per request.

## Metrics
- **Cost Tracking**: Usage increments are recorded per plan.
- **Token Tracking**: Tokens consumed are estimated and logged.
- **Incident Timeline**: Available via the `audit_trail` collection.
