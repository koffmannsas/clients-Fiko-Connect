# OMEGA AUDIT: FIKO CONNECT IA TRANSFORMATION

## 1. Mocks Detection & Forensic Trace

| Module | Feature | Mock Logic Location | Strategy |
| :--- | :--- | :--- | :--- |
| **Conversations** | AI Summary | `aiSummary: data.aiSummary \|\| "..."` | Dynamic generation via Gemini/DeepSeek |
| **Conversations** | Sentiment | `sentiment: data.sentiment \|\| (data.score > 70 ? 'positive' : 'neutral')` | Real classification based on last 5 messages |
| **Conversations** | Objections | `detectedObjections: data.detectedObjections \|\| (...)` | NLP identification (Price, Trust, etc.) |
| **Leads** | AI Score | `score: data.score \|\| 50` | Weighted calculation via AI behavioral analysis |
| **Leads** | AI Radar | `hotLeads = leads.filter(l => (l.score \|\| 0) >= 80)` | Migration to intent-based classification |
| **Fiko Brain** | Strategic Q&A | `let aiContent = "D'après mon analyse..."` | Real context injection into AI Orchestrator |
| **Campaigns** | AI Builder | `alert("IA FiKO : Campagne générée...")` | Full JSON campaign generation from prompt |
| **AfricaIntel** | Observatory | `const data = { 'Abidjan': { ... } }` | Cross-company Firestore aggregation |

## 2. Infrastructure Access
- **Sacred Zone Backend:** Locked. No new endpoints allowed.
- **Frontend AI Access:** Uses `@google/generative-ai` SDK with `process.env.GEMINI_API_KEY`.
- **Connectivity:** Frontend has direct access to Firestore collections `leads` and `messages`.

## 3. Implementation Strategy (Omega Service)
We will centralize all AI logic in `src/services/ai-omega.service.ts` using a specialized system prompt for each feature. This service will act as the "Intelligence Bridge" between the UI and the raw AI models, respecting the multi-provider logic without modifying the server.
