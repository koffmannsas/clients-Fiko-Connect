# SECURITY BASELINE — KCG INDUSTRIAL

## 1. Access Control
- **SSH**: Key-based authentication only. Password login disabled.
- **Firewall**: Default-deny policy. Only 80, 443, and necessary API ports open.
- **RBAC**: Multi-tenant isolation enforced at the Firestore rule level.

## 2. Secrets Management
- **Environment**: `.env` files stored only in memory or restricted root-owned directories.
- **Database**: Sensitive credentials (WABA tokens) stored in the `vault` collection.
- **Keys**: Google Gemini and DeepSeek keys never exposed to frontend.

## 3. Web Security
- **Nginx**:
  - HTTPS only (HSTS enabled).
  - Rate limiting for webhook and auth routes.
- **CORS**: Restricted to official KCG domains.

**VERDICT: SECURITY BASELINE HARDENED.**
