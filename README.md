# RMMGain Dashboard

Une application dashboard pour visualiser les données du protocole RMM sur la blockchain Gnosis.

## Fonctionnalités

- Recherche par adresse wallet (format EVM)
- Visualisation des transactions de dépôt de liquidités (supplies)
- Visualisation des transactions de retrait de liquidités (withdraws)
- Visualisation des transactions d'emprunt (borrows)
- Visualisation des transactions de remboursement (repays)
- Formatage des montants au format humain
- Support des tokens USDC et WXDAI

## Prérequis

- Node.js (v14 ou supérieur)
- Yarn

## Installation

1. Clonez le dépôt :
```bash
git clone <url-du-depot>
cd rmmgain
```

2. Installez les dépendances :
```bash
yarn install
```

3. Configurez les variables d'environnement :

**📋 Voir le fichier `ENV_SETUP.md` pour une configuration détaillée des variables d'environnement.**

Configuration rapide :
```bash
# Frontend (gainorloss)
cp env.example .env.local

# Backend (apigainorloss)
cd backend
cp env.example .env
```

Éditez les fichiers avec vos clés API :
- `.env.local` : Variables pour le frontend Next.js
- `backend/.env` : Variables pour l'API backend

## Développement

Pour lancer le serveur de développement :

```bash
yarn dev
```

L'application sera disponible à l'adresse [http://localhost:3000](http://localhost:3000).

## Production

Pour construire l'application pour la production :

```bash
yarn build
```

Pour lancer l'application en mode production :

```bash
yarn start
```

## How to launch

### Déploiement en production sur serveur

Pour déployer l'application en production sur un serveur, suivez ces étapes :

#### 1. Préparation du serveur

Assurez-vous que votre serveur dispose de :
- Node.js (v18 ou supérieur)
- Yarn ou npm
- Un reverse proxy (nginx recommandé)
- Un gestionnaire de processus (PM2 recommandé)

#### 2. Installation de PM2 (recommandé)

```bash
npm install -g pm2
```

#### 3. Configuration des ports

L'application utilise les ports suivants :
- **Frontend Next.js** : Port 3000 (par défaut)
- **Backend API** : Port 5000 (par défaut)

Vous pouvez modifier ces ports en configurant les variables d'environnement :

```bash
# Frontend
PORT=3000
# Backend
BACKEND_PORT=5000
```

#### 4. Déploiement avec PM2

Créez un fichier `ecosystem.config.js` à la racine du projet :

```javascript
module.exports = {
  apps: [
    {
      name: 'rmmgain-frontend',
      script: 'yarn',
      args: 'start',
      cwd: './',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'rmmgain-backend',
      script: 'node',
      args: 'server.js',
      cwd: './backend',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
  ]
};
```

#### 5. Lancement en production

```bash
# Construire l'application
yarn build

# Démarrer avec PM2
pm2 start ecosystem.config.js

# Sauvegarder la configuration PM2
pm2 save

# Configurer le démarrage automatique
pm2 startup
```

#### 6. Configuration Nginx (optionnel)

Créez un fichier de configuration nginx `/etc/nginx/sites-available/rmmgain` :

```nginx
server {
    listen 80;
    server_name votre-domaine.com;

    # Redirection vers HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name votre-domaine.com;

    # Configuration SSL
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activez la configuration :
```bash
sudo ln -s /etc/nginx/sites-available/rmmgain /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 7. Commandes utiles

```bash
# Voir les processus PM2
pm2 list

# Voir les logs
pm2 logs

# Redémarrer l'application
pm2 restart rmmgain-frontend
pm2 restart rmmgain-backend

# Arrêter l'application
pm2 stop rmmgain-frontend
pm2 stop rmmgain-backend

# Supprimer l'application de PM2
pm2 delete rmmgain-frontend
pm2 delete rmmgain-backend
```

#### 8. Variables d'environnement de production

**📋 Voir le fichier `ENV_SETUP.md` pour la configuration complète des variables de production.**

Configuration rapide :
```bash
# Frontend (gainorloss)
cp env.example .env.production

# Backend (apigainorloss)
cd backend
cp env.example .env.production
```

Variables principales à configurer :
- **Frontend** : `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_GNOSISSCAN_API_KEY`
- **Backend** : `PORT=5000`, `NODE_ENV=production`, `CORS_ORIGIN`

## Structure du projet

### Frontend : `gainorloss` (Next.js)
- `components/` : Composants React réutilisables
- `pages/` : Pages de l'application
- `utils/` : Utilitaires et fonctions d'aide
- `graphql-queries/` : Requêtes GraphQL pour TheGraph
- `styles/` : Fichiers de style
- `public/` : Assets statiques

### Backend : `apigainorloss` (Express.js)
- `backend/` : API REST avec Express.js
  - `routes/` : Routes de l'API
  - `services/` : Services métier
  - `scripts/` : Scripts utilitaires

## Tokens

L'application gère les tokens suivants sur la blockchain Gnosis :

- USDC : 0xddafbb505ad214d7b80b1f830fccc89b60fb7a83 (6 décimales)
- armmUSDC : 0xeD56F76E9cBC6A64b821e9c016eAFbd3db5436D1 (token rémunérateur)
- debtUSDC : 0x69c731aE5f5356a779f44C355aBB685d84e5E9e6 (token de dette)
- WXDAI : 0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d (18 décimales)
- armmWXDAI : 0x0cA4f5554Dd9Da6217d62D8df2816c82bba4157b (token rémunérateur)
- debtWXDAI : 0x9908801dF7902675C3FEDD6Fea0294D18D5d5d34 (token de dette) 