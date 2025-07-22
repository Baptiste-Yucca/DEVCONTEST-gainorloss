# Frontend RMM Gain

## Configuration

### Variables d'environnement

Créez un fichier `.env.local` à la racine du projet :

```bash
# Configuration du backend (variable publique pour le client)
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001

# En production, changer pour l'URL réelle du backend
# NEXT_PUBLIC_BACKEND_URL=https://api.votre-domaine.com
```

### Démarrage

1. **Installer les dépendances** :
   ```bash
   npm install
   ```

2. **Configurer l'URL du backend** :
   - Créer le fichier `.env.local` avec l'URL du backend
   - En développement : `NEXT_PUBLIC_BACKEND_URL=http://localhost:3001`
   - En production : `NEXT_PUBLIC_BACKEND_URL=https://votre-api.com`

3. **Démarrer le frontend** :
   ```bash
   npm run dev
   ```

4. **Démarrer le backend** (dans un autre terminal) :
   ```bash
   cd backend
   npm start
   ```

## Architecture

### Flux de données

1. **Frontend** → `BACKEND_URL/api/rmm/v3/addr1/addr2/...` (Appel direct)
2. **Backend** → Retourne les données calculées
3. **Frontend** → Transforme et affiche les données

### Structure des fichiers

```
pages/
├── index.tsx              # Page principale
└── _app.tsx              # Configuration Next.js

components/
├── AddressForm.tsx       # Formulaire d'adresses
├── WalletDashboard.tsx   # Dashboard principal
├── WalletSummary.tsx     # Résumé des données
└── WalletChart.tsx       # Graphiques SVG

types/
└── wallet.ts            # Types TypeScript

styles/
└── globals.css          # Styles Tailwind CSS
```

## Fonctionnalités

- ✅ Validation des adresses EVM (format + longueur)
- ✅ Support jusqu'à 3 adresses
- ✅ Graphiques d'évolution temporelle
- ✅ Affichage des dettes, dépôts et intérêts
- ✅ Interface responsive avec onglets
- ✅ Configuration paramétrable du backend

## Debug

Les logs sont affichés dans la console du navigateur et du serveur :

- 🚀 Envoi des adresses
- 🔗 URL du backend utilisée
- 📡 Appels API détaillés
- ✅ Données reçues
- ❌ Erreurs avec détails 