# Scripts de gestion des taux d'intérêt RMM

Ce dossier contient les scripts pour gérer la base de données SQLite des taux d'intérêt du protocole RMM (RealToken Money Market).

## Vue d'ensemble

Au lieu de faire des appels API à chaque requête utilisateur, cette solution :
- Stocke les taux d'intérêt dans une base de données SQLite locale
- Met à jour quotidiennement les nouveaux taux via un cron job
- Permet à l'application de lire rapidement les taux depuis la base locale

## Structure des fichiers

```
scripts/
├── README.md              # Ce fichier
├── package.json           # Dépendances pour les scripts
├── database.js            # Module de gestion de la base SQLite
├── init-rates.js          # Script d'initialisation de la DB
├── init-transactions.js   # Script d'initialisation de transactions.db
└── update-rates.js        # Script de mise à jour quotidienne
```

## Installation

### 1. Installer les dépendances

```bash
cd scripts
npm install
```

### 2. Initialiser les bases de données

**⚠️ Important**: Ces étapes doivent être exécutées une seule fois lors de la première installation.

#### Base de données des taux (rates.db)

```bash
npm run init
# ou directement:
node init-rates.js
```

Cette commande va :
- Créer le dossier `data/` et le fichier `rates.db`
- Récupérer tous les taux historiques depuis le lancement du RMM (24 janvier 2024)
- Insérer les données pour USDC et WXDAI
- Afficher un résumé des données importées

**Durée estimée**: 2-5 minutes (selon la connexion réseau)

#### Base de données des transactions (transactions.db)

```bash
npm run init-transactions
# ou directement:
node init-transactions.js
```

Cette commande va :
- Créer le fichier `transactions.db` dans le dossier `data/`
- Créer les tables nécessaires pour stocker les transactions utilisateur
- Créer les index pour optimiser les performances
- Afficher les statistiques de la base de données

**Durée estimée**: Quelques secondes

### 3. Vérifier l'installation

#### Statistiques des taux

```bash
npm run stats
```

Cette commande affiche les statistiques de la base de données `rates.db` :
- Nombre d'entrées par token
- Dates de couverture
- Dernières mises à jour

#### Statistiques des transactions

```bash
npm run stats-transactions
```

Cette commande affiche les statistiques de la base de données `transactions.db` :
- Nombre de transactions par table
- Nombre d'utilisateurs uniques
- Statuts de cache

## Mise à jour quotidienne

### Script de mise à jour

Le script `update-rates.js` récupère uniquement les nouveaux taux depuis la dernière mise à jour :

```bash
npm run update
# ou directement:
node update-rates.js
```

### Configuration du cron job

Pour automatiser la mise à jour quotidienne, ajoutez cette ligne à votre crontab :

```bash
# Éditer le crontab
crontab -e

# Ajouter cette ligne (exécution tous les jours à 2h00 du matin)
0 2 * * * cd /chemin/vers/votre/projet/scripts && /usr/bin/node update-rates.js >> /var/log/rmm-rates-update.log 2>&1
```

**Remplacez `/chemin/vers/votre/projet` par le chemin réel vers votre projet.**

### Exemple de ligne crontab complète

```bash
# Mise à jour quotidienne des taux RMM à 2h00
0 2 * * * cd /home/user/rmmgain/scripts && /usr/bin/node update-rates.js >> /var/log/rmm-rates-update.log 2>&1
```

### Vérification du cron job

Pour vérifier que le cron job fonctionne :

```bash
# Voir les cron jobs actifs
crontab -l

# Voir les logs de mise à jour
tail -f /var/log/rmm-rates-update.log
```

## Utilisation dans l'application

Une fois la base de données configurée, l'application Next.js utilisera automatiquement les taux stockés localement via l'API endpoint `/api/rates`.

L'application va automatiquement :
- Lire les taux depuis la base de données SQLite
- Utiliser les mêmes fonctions de calcul d'intérêts
- Afficher les résultats sans différence pour l'utilisateur

## Tokens supportés

- **USDC**: Reserve ID `0xddafbb505ad214d7b80b1f830fccc89b60fb7a830xdaa06cf7adceb69fcfde68d896818b9938984a70`
- **WXDAI**: Reserve ID `0xe91d153e0b41518a2ce8dd3d7944fa863463a97d0xdaa06cf7adceb69fcfde68d896818b9938984a70`

## Structure de la base de données

```sql
CREATE TABLE interest_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL,                    -- 'USDC' ou 'WXDAI'
  reserve_id TEXT NOT NULL,               -- ID de réserve du token
  date TEXT NOT NULL,                     -- Format YYYYMMDD
  year INTEGER NOT NULL,                  -- Année
  month INTEGER NOT NULL,                 -- Mois (1-12, format humain)
  day INTEGER NOT NULL,                   -- Jour (1-31)
  timestamp INTEGER NOT NULL,             -- Timestamp Unix
  liquidity_rate_avg REAL,               -- Taux de liquidité
  variable_borrow_rate_avg REAL,         -- Taux d'emprunt variable
  utilization_rate_avg REAL,             -- Taux d'utilisation
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(token, date)
);
```

## Dépannage

### Problème : "Base de données non trouvée"

```bash
# Vérifier que la base existe
ls -la ../data/rates.db

# Si elle n'existe pas, réinitialiser
npm run init
```

### Problème : "Aucun nouveau taux trouvé"

C'est normal si le script de mise à jour a déjà été exécuté dans la journée. Les taux RMM sont mis à jour une fois par jour.

### Problème : Erreurs de réseau

Les scripts font des appels à l'API RMM. En cas de problème de réseau :
- Vérifier la connexion Internet
- Réessayer plus tard
- Vérifier que l'API RMM est accessible : https://rmm-api.realtoken.network/

### Voir les logs détaillés

```bash
# Exécuter avec logs détaillés
DEBUG=* node update-rates.js

# Ou voir directement les logs de la base
sqlite3 ../data/rates.db "SELECT COUNT(*) as total, token FROM interest_rates GROUP BY token;"
```

## Performance

- **Taille de la base** : ~500 KB pour un an de données (USDC + WXDAI)
- **Vitesse de lecture** : < 10ms pour récupérer tous les taux d'un token
- **Mise à jour quotidienne** : < 30 secondes
- **Initialisation complète** : 2-5 minutes

## Sécurité

- La base de données est en lecture seule pour l'application web
- Seuls les scripts peuvent modifier les données
- Pas d'authentification requise pour l'API RMM (données publiques)
- Sauvegarde recommandée du fichier `data/rates.db`

## Maintenance

### Sauvegarde

```bash
# Sauvegarder la base de données
cp ../data/rates.db ../data/rates.db.backup.$(date +%Y%m%d)
```

### Nettoyage

```bash
# Voir l'espace utilisé
du -h ../data/rates.db

# La base de données n'a pas besoin de nettoyage (les taux historiques sont utiles)
```

### Mise à jour des scripts

Après toute modification des scripts :
1. Tester d'abord en mode dry-run
2. Sauvegarder la base de données
3. Redémarrer le cron job si nécessaire 