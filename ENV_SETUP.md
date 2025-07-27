# Configuration des Variables d'Environnement

## Structure des fichiers .env

Ce projet utilise une architecture séparée avec deux applications distinctes :

### 🎯 Frontend : `gainorloss`
- **Fichier** : `.env.local` (à la racine du projet)
- **Port** : 3000
- **Rôle** : Interface utilisateur Next.js

### 🔧 Backend : `apigainorloss`
- **Fichier** : `backend/.env` (dans le dossier backend)
- **Port** : 5000
- **Rôle** : API REST avec Express.js

## Configuration par environnement

### Développement

#### 1. Frontend (gainorloss)
```bash
# À la racine du projet
cp env.example .env.local
```

Éditez `.env.local` :
```bash
# URL du backend API
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000

# Clés API publiques
NEXT_PUBLIC_GNOSISSCAN_API_KEY=votre_clef_gnosisscan
NEXT_PUBLIC_THEGRAPH_API_URL=https://api.thegraph.com/subgraphs/id/QmVH7ota6caVV2ceLY91KYYh6BJs2zeMScTTYgKDpt7VRg
```

#### 2. Backend (apigainorloss)
```bash
# Dans le dossier backend
cd backend
cp env.example .env
```

Éditez `backend/.env` :
```bash
# Configuration du serveur
PORT=5000
NODE_ENV=development

# Clés API privées
THEGRAPH_API_KEY=votre_clef_thegraph
GNOSISSCAN_API_KEY=votre_clef_gnosisscan

# Configuration CORS
CORS_ORIGIN=http://localhost:3000
```

### Production

#### 1. Frontend (gainorloss)
```bash
# À la racine du projet
cp env.example .env.production
```

Éditez `.env.production` :
```bash
# URL du backend API en production
NEXT_PUBLIC_BACKEND_URL=https://api.votre-domaine.com

# Clés API publiques
NEXT_PUBLIC_GNOSISSCAN_API_KEY=votre_clef_gnosisscan
NEXT_PUBLIC_THEGRAPH_API_URL=https://api.thegraph.com/subgraphs/id/QmVH7ota6caVV2ceLY91KYYh6BJs2zeMScTTYgKDpt7VRg
```

#### 2. Backend (apigainorloss)
```bash
# Dans le dossier backend
cd backend
cp env.example .env.production
```

Éditez `backend/.env.production` :
```bash
# Configuration du serveur
PORT=5000
NODE_ENV=production

# Clés API privées
THEGRAPH_API_KEY=votre_clef_thegraph
GNOSISSCAN_API_KEY=votre_clef_gnosisscan

# Configuration CORS
CORS_ORIGIN=https://votre-domaine.com
```

## Lancement des applications

### Développement
```bash
# Terminal 1 - Backend
cd backend
npm install
npm run dev

# Terminal 2 - Frontend
npm install
npm run dev
```

### Production
```bash
# Backend
cd backend
npm install
npm run build
npm start

# Frontend
npm install
npm run build
npm start
```

## Variables importantes

### Frontend (NEXT_PUBLIC_*)
- `NEXT_PUBLIC_BACKEND_URL` : URL de l'API backend
- `NEXT_PUBLIC_GNOSISSCAN_API_KEY` : Clé API GnosisScan
- `NEXT_PUBLIC_THEGRAPH_API_URL` : URL de l'API TheGraph

### Backend
- `PORT` : Port du serveur (5000)
- `NODE_ENV` : Environnement (development/production)
- `THEGRAPH_API_KEY` : Clé API TheGraph
- `GNOSISSCAN_API_KEY` : Clé API GnosisScan
- `CORS_ORIGIN` : Origine autorisée pour CORS

## Sécurité

⚠️ **Important** :
- Les variables `NEXT_PUBLIC_*` sont visibles côté client
- Les variables sans `NEXT_PUBLIC_` sont privées côté serveur
- Ne jamais commiter les fichiers `.env*` dans Git
- Utiliser des clés API différentes pour dev et prod

## Dépannage

### Problème de connexion entre frontend et backend
1. Vérifiez que `NEXT_PUBLIC_BACKEND_URL` pointe vers le bon port
2. Vérifiez que `CORS_ORIGIN` dans le backend correspond à l'URL du frontend
3. Assurez-vous que les deux serveurs sont démarrés

### Variables non chargées
1. Vérifiez que les fichiers `.env` sont au bon endroit
2. Redémarrez les serveurs après modification des variables
3. Vérifiez la syntaxe des variables (pas d'espaces autour du `=`) 