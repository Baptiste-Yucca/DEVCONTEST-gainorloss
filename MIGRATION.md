# Guide de migration : API → Base de données SQLite

Ce guide explique comment migrer de l'ancienne logique (appels API directs) vers la nouvelle logique (base de données SQLite).

## Résumé des changements

### Avant (problématique)
- Appel API `https://rmm-api.realtoken.network/data/rates-history` à chaque requête utilisateur
- Latence élevée (2-5 secondes par calcul)
- Charge sur l'API externe
- Pas de cache local

### Après (solution)
- Taux stockés dans une base SQLite locale
- Lecture rapide depuis la base (< 10ms)
- Mise à jour quotidienne automatique via cron
- Aucun changement visible pour l'utilisateur final

## Étapes de migration

### 1. Installation des scripts

```bash
# Installer les dépendances pour les scripts
cd scripts
npm install

# Installer la dépendance SQLite dans l'app principale
cd ..
npm install sqlite3
```

### 2. Initialisation de la base de données

```bash
# Exécuter le script d'initialisation (une seule fois)
cd scripts
npm run init
```

Cette étape peut prendre 2-5 minutes car elle récupère tous les taux historiques depuis janvier 2024.

### 3. Configuration du cron job

```bash
# Éditer le crontab
crontab -e

# Ajouter la ligne suivante (remplacer le chemin par le bon)
0 2 * * * cd /votre/chemin/vers/rmmgain/scripts && /usr/bin/node update-rates.js >> /var/log/rmm-rates-update.log 2>&1
```

### 4. Mise à jour de l'application

L'application a été modifiée pour utiliser automatiquement la base de données via :
- Nouvelle API endpoint `/api/rates`
- Nouveau module `utils/interest-calculations-db.ts`
- Import mis à jour dans `pages/index.tsx`

## Fichiers modifiés/ajoutés

### Nouveaux fichiers
- `scripts/database.js` - Module de gestion SQLite
- `scripts/init-rates.js` - Script d'initialisation
- `scripts/update-rates.js` - Script de mise à jour quotidienne
- `scripts/package.json` - Dépendances des scripts
- `scripts/README.md` - Documentation des scripts
- `utils/interest-calculations-db.ts` - Calculs utilisant la DB
- `pages/api/rates.ts` - API endpoint pour la DB
- `data/rates.db` - Base de données SQLite (créée automatiquement)

### Fichiers modifiés
- `package.json` - Ajout de la dépendance `sqlite3`
- `pages/index.tsx` - Import des nouvelles fonctions

### Fichiers conservés (pour référence)
- `utils/interest-calculations.ts` - Ancienne logique (peut être supprimée plus tard)

## Vérification de la migration

### 1. Vérifier que la base est initialisée

```bash
cd scripts
npm run stats
```

Vous devriez voir quelque chose comme :
```
┌─────────┬─────────────────────┬────────────────────┬───────────────────┐
│ (index) │       Token         │ Nombre d'entrées   │ Date la plus récente │
├─────────┼─────────────────────┼────────────────────┼───────────────────┤
│    0    │       'USDC'        │        365         │    '15/01/2025'   │
│    1    │       'WXDAI'       │        365         │    '15/01/2025'   │
└─────────┴─────────────────────┴────────────────────┴───────────────────┘
```

### 2. Tester l'application

```bash
# Démarrer l'application
npm run dev
```

- Aller sur http://localhost:3000
- Tester avec une adresse qui a des transactions
- Vérifier que les calculs fonctionnent normalement
- Les temps de réponse devraient être beaucoup plus rapides

### 3. Vérifier les logs

```bash
# Voir les logs du navigateur (F12 > Console)
# Vous devriez voir des messages comme :
# "⚠️ Récupération des taux depuis la DB pour USDC à partir de 20240124"
# "⚠️ X taux récupérés depuis la base de données"
```

## Résolution de problèmes

### Problème : "Base de données non trouvée"

```bash
cd scripts
npm run init
```

### Problème : Erreurs de calcul

Vérifier que la base contient des données :
```bash
cd scripts
npm run stats
```

### Problème : Performance dégradée

Vérifier que l'app utilise bien la DB et pas l'ancienne API :
- Ouvrir F12 > Network dans le navigateur
- Chercher s'il y a des appels à `rmm-api.realtoken.network`
- Il ne devrait y avoir que des appels à `/api/rates`

## Rollback (en cas de problème)

Pour revenir temporairement à l'ancienne logique :

1. Dans `pages/index.tsx`, remplacer :
```typescript
import {
  calculateInterestFromDB,
  calculateDailyDebtWithInterestFromDB
} from '../utils/interest-calculations-db';
```

Par :
```typescript
import {
  calculateInterest,
  calculateDailyDebtWithInterest
} from '../utils/interest-calculations';
```

2. Remplacer les appels de fonction correspondants dans le code

3. Redémarrer l'application

## Avantages de la nouvelle approche

- **Performance** : 10-50x plus rapide
- **Fiabilité** : Pas de dépendance aux appels API externes pendant l'utilisation
- **Coût** : Réduction de la charge sur l'API RMM
- **Maintenance** : Données toujours à jour via le cron
- **Évolutivité** : Facilite l'ajout de nouvelles fonctionnalités

## Maintenance continue

### Surveillance quotidienne
```bash
# Vérifier que le cron fonctionne
tail -f /var/log/rmm-rates-update.log

# Vérifier les données récentes
cd scripts && npm run stats
```

### Sauvegarde mensuelle
```bash
# Sauvegarder la base de données
cp data/rates.db data/rates.db.backup.$(date +%Y%m%d)
```

### Nettoyage des logs
```bash
# Nettoyer les anciens logs (optionnel)
sudo logrotate /var/log/rmm-rates-update.log
``` 