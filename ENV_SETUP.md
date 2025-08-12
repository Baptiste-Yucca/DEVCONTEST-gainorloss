# Configuration des Variables d'Environnement

Ce document explique comment configurer les variables d'environnement pour le projet RMM Gain.

## 📁 Structure des fichiers d'environnement

```
rmmgain/
├── .env.example          # Exemple pour le frontend
├── .env                  # Variables d'environnement frontend (à créer)
├── backend/
│   ├── env.example       # Exemple pour le backend
│   └── .env             # Variables d'environnement backend (à créer)
└── data/
    ├── rates.db          # Base de données des taux (générée automatiquement)
    └── transactions.db   # Base de données des transactions (générée automatiquement)
```

## 🚀 Configuration Frontend

### 1. Créer le fichier `.env`

```bash
cp .env.example .env
```

### 2. Configurer les variables

Éditez le fichier `.env` avec vos valeurs :

```env
# URL du backend API
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000

# Clés API publiques (accessibles côté client)
NEXT_PUBLIC_GNOSISSCAN_API_KEY=votre_cle_gnosisscan
NEXT_PUBLIC_THEGRAPH_API_URL=https://api.thegraph.com/subgraphs/id/QmVH7ota6caVV2ceLY91KYYh6BJs2zeMScTTYgKDpt7VRg

# Configuration de l'application
NEXT_PUBLIC_APP_NAME=GainOrLoss
NEXT_PUBLIC_APP_VERSION=1.0.0
```

## 🔧 Configuration Backend

### 1. Créer le fichier `.env`

```bash
cd backend
cp env.example .env
```

### 2. Configurer les variables

Éditez le fichier `backend/.env` avec vos valeurs :

```env
# Configuration du serveur
PORT=5000
NODE_ENV=development

# Clés API privées (côté serveur uniquement)
THEGRAPH_API_KEY=votre_cle_thegraph
GNOSISSCAN_API_KEY=votre_cle_gnosisscan


# Configuration CORS
CORS_ORIGIN=http://localhost:3000

# Configuration de la base de données
DB_PATH=./data/rates.db

# Configuration des logs
LOG_LEVEL=info

# Configuration de sécurité
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🔑 Obtention des Clés API

### GnosisScan API Key
1. Allez sur [GnosisScan](https://gnosisscan.io/)
2. Créez un compte gratuit
3. Allez dans votre profil → API Keys
4. Créez une nouvelle clé API
5. Utilisez cette clé pour `GNOSISSCAN_API_KEY`

### TheGraph API Key
1. Allez sur [TheGraph](https://thegraph.com/)
2. Créez un compte
3. Allez dans votre dashboard
4. Créez une nouvelle clé API
5. Utilisez cette clé pour `THEGRAPH_API_KEY`

## 🗄️ Bases de Données

### Initialisation automatique

Les bases de données sont créées automatiquement lors de la première utilisation :

- **`data/rates.db`** : Base de données des taux d'intérêt
- **`data/transactions.db`** : Base de données des transactions utilisateur

### Initialisation manuelle

Si vous voulez initialiser manuellement :

```bash
# Initialiser la base des taux
cd scripts
npm run init

# Initialiser la base des transactions
npm run init-transactions
```

## 🔒 Sécurité

### Fichiers ignorés par Git

Les fichiers suivants sont automatiquement ignorés par Git :

- `.env` et `.env.local`
- `backend/.env`
- `data/*.db`
- `data/*.sqlite`
- `data/*.sqlite3`

### Vérification

Pour vérifier que vos fichiers sensibles sont bien ignorés :

```bash
git status --ignored
```

Vous ne devriez pas voir vos fichiers `.env` ou bases de données dans la liste des fichiers suivis.

## 🚀 Déploiement

### Variables d'environnement en production

En production, modifiez les URLs :

```env
# Frontend (.env)
NEXT_PUBLIC_BACKEND_URL=https://api.votre-domaine.com

# Backend (backend/.env)
NODE_ENV=production
CORS_ORIGIN=https://votre-domaine.com
```

### Bases de données en production

Les bases de données seront créées automatiquement lors du premier démarrage de l'application.

## ❗ Troubleshooting

### Erreur "Cannot find module"
- Vérifiez que les dépendances sont installées : `npm install`
- Vérifiez que les fichiers `.env` existent

### Erreur "API key invalid"
- Vérifiez que vos clés API sont correctes
- Vérifiez que les clés ont les bonnes permissions

### Erreur "Database not found"
- Les bases de données sont créées automatiquement
- Vérifiez les permissions d'écriture dans le dossier `data/`

### Erreur Git "fichiers sensibles"
- Vérifiez que les fichiers sont bien dans `.gitignore`
- Utilisez `git rm --cached <fichier>` pour supprimer du suivi 