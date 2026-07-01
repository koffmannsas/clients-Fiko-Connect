# SUBSCRIPTION ENGINE REPORT - V6.0

## Plans & Quotas
- **Terra**: 1,000 messages/mo.
- **Mars**: 5,000 messages/mo.
- **Krypton**: 20,000 messages/mo.
- **Galaxy**: 100,000 messages/mo.
- **Enterprise**: Custom limits.

## Enforcement
- **Quota Check**: Implemented in `WABAService.sendMessage`.
- **Usage Tracking**: Incremented atomically in `subscriptions/{companyId}/messagesSent`.
- **Industrial Billing**: Ready for integration with payment gateways (Stripe/Fiko Pay).

## Logic
- Messages are blocked instantly if the quota is reached.
- CEO/Admin Dashboard reflects real-time consumption.
