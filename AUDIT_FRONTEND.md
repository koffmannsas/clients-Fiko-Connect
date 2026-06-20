# AUDIT FRONTEND - FIKO CONNECT (PRODUCTION RECOVERY STATE)

## 1. État des Écrans & Modules

| Module | Statut | Détails |
| :--- | :--- | :--- |
| **QuantumGate** | Terminée | Tunnel d'onboarding fonctionnel avec bypass Meta Review. |
| **Dashboard Executive** | **À REFAIRE** | Trop tactique, contient des fonctions de marketplace et savoir. Manque de vision CEO (CA, Taux Conv). |
| **Fiko Leads (CRM)** | Partiel | Connecté Firestore (`onSnapshot`). Manque Drag & Drop et Score IA réel. |
| **Conversations** | Partiel | Connecté Firestore. Manque Résumé IA, Sentiment et Objections. |
| **Campagnes** | Mocké | UI présente mais pas de création réelle ni segmentation. |
| **Automation** | Mocké | Simple affichage de cartes statiques. |
| **Paiements** | Partiel | Historique simulé. Manque lien réel avec passerelles. |
| **Analytics** | Mocké | Graphiques Recharts utilisant des données locales. |

## 2. Infrastructure Firebase (Firestore)

### Collections Utilisées
- `leads`: Stockage des prospects (companyId, phone, status).
- `messages`: Historique WhatsApp (sender, content, timestamp).
- `fiko_memory`: Contexte business par entreprise.
- `companies`: Métadonnées multi-tenant.
- `users`: Profils utilisateurs & rôles.
- `processed_messages`: Idempotence webhook (Backend).

### Collections / Champs Manquants (P0 pour Titan)
- `campaigns`: Pour le moteur de segmentation et d'envoi.
- `stats_daily`: Pour les cartes CEO du Dashboard (CA, Leads, Conv).
- **Champs Leads**: `aiScore` (0-100), `purchaseProbability`, `detectedObjections`, `detectedSentiment`.
- `partners`: Pour le réseau de distribution.

## 3. Flux Intelligence Artificielle (IA)

### Flux Existants
- `generateSmartResponse`: Orchestrateur backend fonctionnel.
- `syncLead`: Création automatique de lead au premier message.

### Flux Manquants
- **Fiko Brain**: Analyseur de performance global.
- **Sentiment Engine**: Analyse en temps réel du sentiment client.
- **Objection Detector**: Identification automatique (Prix, Temps, Confiance).
- **Campaign AI Builder**: Génération de messages via prompt naturel.

## 4. Fonctions CRM

| Fonction | État |
| :--- | :--- |
| **Pipeline Kanban** | Visuel OK, Drag & Drop Manquant. |
| **Multi-tenancy** | OK (Filtrage par `companyId` actif). |
| **Realtime Sync** | OK (Utilisation de `onSnapshot`). |
| **Lead Scoring** | Mocké (Utilise des valeurs aléatoires/fixes). |
| **Mobile First** | Partiel (Vues desktop-first, besoin d'optimisation mobile). |

## 5. Dette Technique & Risques
- **Mocks ubiquitaires**: Trop de composants utilisent des `useState` avec des arrays codés en dur.
- **Dashboard pollué**: Mélange de pilotage, de marketplace et de cours d'académie.
- **Performance**: Pas de virtualisation pour les longues listes de leads/messages.
