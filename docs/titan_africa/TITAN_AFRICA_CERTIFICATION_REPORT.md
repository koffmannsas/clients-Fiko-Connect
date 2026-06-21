# TITAN AFRICA CERTIFICATION REPORT

## 1. Dashboard (CEO View)
- **État :** Fonctionnel / Connecté.
- **Firestore :**
  - Collection : `leads`
  - Requête : `query(collection(db, 'leads'), where('companyId', '==', companyId), orderBy('updatedAt', 'desc'), limit(10))`
  - Temps réel : **OUI** (`onSnapshot`)
- **Données réelles :** Liste des derniers prospects, comptage pour le Radar IA (Hot/Warm/Cold).
- **Mocks :** Graphique Recharts (`graphData`) statique, KPIs de haut de page statiques.

## 2. Leads (Sales Command Center)
- **État :** Fonctionnel / Connecté.
- **Firestore :**
  - Collection : `leads`
  - Requête : `query(collection(db, 'leads'), where('companyId', '==', companyId), orderBy('updatedAt', 'desc'))`
  - Temps réel : **OUI** (`onSnapshot`)
- **Données réelles :** Liste complète des prospects, mise à jour des statuts via `updateDoc`.
- **Mocks :** `dealValue`, `purchaseProbability`, `bestAction` sont générés/assignés localement ou par défaut si absents du document.

## 3. Conversations (Ultra Premium)
- **État :** Fonctionnel / Connecté.
- **Firestore :**
  - Collection : `leads` (pour les threads)
  - Collection : `messages` (pour le contenu du chat)
  - Requête Messages : `query(collection(db, 'messages'), where('companyId', '==', companyId), where('conversationId', '==', activeThreadId), orderBy('timestamp', 'asc'))`
  - Temps réel : **OUI** (`onSnapshot` sur les deux collections)
- **Données réelles :** Liste des contacts, historique des messages, envoi de nouveaux messages via `addDoc`.
- **Mocks :** `aiSummary`, `detectedObjections`, `sentiment`, `recommendedAction` reposent sur des données par défaut ou des calculs locaux basés sur le score.

## 4. Campaigns (Engine Africa)
- **État :** UI Uniquement / Mocké.
- **Firestore :** Aucune utilisation détectée dans ce composant.
- **Temps réel :** **NON**
- **Données réelles :** Aucune (liste de campagnes statique).
- **Mocks :** Simulateur de génération par IA (`handleGenerate`).

## 5. FikoBrain (Sales Copilot)
- **État :** Mocké.
- **Firestore :** Aucune utilisation détectée dans ce composant.
- **IA :** Simulateur de réponse locale (`handleQuery`).
- **Données réelles :** Aucune.

## 6. AfricaIntelligence (Observatory)
- **État :** Mocké / UI Uniquement.
- **Firestore :** Aucune utilisation détectée.
- **Données réelles :** Aucune.
- **Mocks :** Map pins et rapports de ville basés sur l'objet `data` local.
