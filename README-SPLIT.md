# RMM Gain - Architecture Frontend/Backend

Ce projet a été restructuré en deux parties distinctes : un **backend API** et un **frontend Next.js**. Cette séparation offre plusieurs avantages :

## 🏗️ Architecture

```
rmmgain/
├── backend/           # API Express.js
│   ├── routes/        # Routes API
│   ├── services/      # Services externes (GraphQL, Gnosisscan)
│   ├── scripts/       # Scripts de gestion de la DB
│   └── server.js      # Serveur principal
├── frontend/          # Application Next.js
│   ├── pages/         # Pages React
│   ├── components/    # Composants React
│   ├── services/      # Service API client
│   └── styles/        # Styles CSS
└── scripts/           # Scripts partagés (ancien dossier)
```

## 🚀 Avantages de cette séparation

### 🔒 Sécurité
- **Clés API protégées** : Les clés TheGraph et Gnosisscan restent côté serveur
- **Validation côté serveur** : Toutes les validations sont centralisées
- **CORS configuré** : Contrôle d'accès aux ressources

### 📈 Scalabilité
- **API réutilisable** : D'autres applications peuvent utiliser l'API
- **Déploiement indépendant** : Frontend et backend peuvent être déployés séparément
- **Cache partagé** : Base de données SQLite accessible à tous les clients

### 🛠️ Maintenance
- **Séparation des responsabilités** : Logique métier vs interface utilisateur
- **Tests indépendants** : Tests API et tests frontend séparés
- **Développement parallèle** : Équipes peuvent travailler en parallèle

## 🔧 Installation et Configuration

### Backend

1. **Installer les dépendances** :
```bash
cd backend
npm install
```

2. **Configurer les variables d'environnement** :
```bash
cp env.example .env
# Éditer .env avec vos clés API
```

3. **Initialiser la base de données** :
```bash
npm run init-db
```

4. **Démarrer le serveur** :
```bash
npm run dev  # Développement
npm start    # Production
```

### Frontend

1. **Installer les dépendances** :
```bash
cd frontend
npm install
```

2. **Configurer l'URL de l'API** :
```bash
# Créer .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

3. **Démarrer l'application** :
```bash
npm run dev
```

## 📡 API Endpoints

### Taux d'intérêt
- `POST /api/rates` - Récupérer les taux pour un token
- `GET /api/rates/stats` - Statistiques de la base de données
- `GET /api/rates/tokens` - Liste des tokens supportés

### Transactions
- `GET /api/transactions/:address` - Transactions d'une adresse
- `GET /api/transactions/:address/summary` - Résumé des transactions

### Soldes
- `GET /api/balances/:address` - Soldes d'une adresse
- `GET /api/balances/:address/tokens` - Détails par token

### Santé
- `GET /api/health` - État de santé du serveur
- `GET /api/health/detailed` - Vérification détaillée

## 🔐 Variables d'environnement

### Backend (.env)
```env
PORT=3001
NODE_ENV=development
THEGRAPH_API_KEY=your_thegraph_api_key
GNOSISSCAN_API_KEY=your_gnosisscan_api_key
CORS_ORIGIN=http://localhost:3000
DB_PATH=./data/rates.db
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

## 🚀 Déploiement

### Backend (Production)
```bash
cd backend
npm install --production
npm start
```

### Frontend (Production)
```bash
cd frontend
npm run build
npm start
```

## 🔄 Migration depuis l'ancienne version

1. **Sauvegarder les données** :
```bash
cp scripts/data/rates.db backend/data/
```

2. **Migrer les composants** :
```bash
cp components/* frontend/components/
cp pages/* frontend/pages/
cp styles/* frontend/styles/
```

3. **Adapter les imports** :
- Remplacer les imports directs par les appels API
- Utiliser les services dans `frontend/services/api.ts`

## 📊 Utilisation de l'API

### Exemple avec curl
```bash
# Récupérer les taux USDC
curl -X POST http://localhost:3001/api/rates \
  -H "Content-Type: application/json" \
  -d '{"token": "USDC", "fromDate": "20240101"}'

# Récupérer les transactions
curl http://localhost:3001/api/transactions/0x1234...

# Vérifier la santé
curl http://localhost:3001/api/health
```

### Exemple avec JavaScript
```javascript
import { ratesService, transactionsService } from './services/api';

// Récupérer les taux
const rates = await ratesService.getRates('USDC', '20240101');

// Récupérer les transactions
const transactions = await transactionsService.getTransactions('0x1234...');
```

## 🛡️ Sécurité

### CORS
Le backend est configuré pour accepter les requêtes uniquement depuis les origines autorisées.

### Rate Limiting
Considérez l'ajout d'un middleware de rate limiting pour protéger l'API.

### Validation
Toutes les entrées utilisateur sont validées côté serveur.

## 🔧 Développement

### Scripts utiles
```bash
# Backend
npm run dev          # Développement avec nodemon
npm run init-db      # Initialiser la DB
npm run update-rates # Mettre à jour les taux
npm run stats        # Voir les stats de la DB

# Frontend
npm run dev          # Développement
npm run build        # Build de production
npm run lint         # Linter
```

### Debug
```bash
# Backend
DEBUG=* npm run dev

# Frontend
NODE_OPTIONS='--inspect' npm run dev
```

## 📝 Documentation API

L'API est auto-documentée. Consultez :
- `http://localhost:3001/` - Informations générales
- `http://localhost:3001/api/health` - État du serveur

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature
3. Développer dans le dossier approprié (backend ou frontend)
4. Tester les deux parties
5. Soumettre une pull request

## 📞 Support

Pour toute question ou problème :
1. Vérifier les logs du backend et frontend
2. Consulter la documentation API
3. Vérifier la configuration des variables d'environnement
4. Tester les endpoints individuellement 