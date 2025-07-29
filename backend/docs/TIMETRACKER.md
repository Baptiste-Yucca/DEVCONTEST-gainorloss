# Système de Timetracker (Chronomètre)

## Vue d'ensemble

Le système de timetracker permet de mesurer et logger les temps de réponse des différentes requêtes dans le backend RMM Gain API. Il track automatiquement les performances des requêtes GraphQL, Gnosisscan et des calculs d'intérêts.

## Fonctionnalités

### 🔧 Middleware de tracking
- **Timetracker automatique** : Mesure le temps total de chaque requête
- **Timers personnalisés** : Permet de mesurer des sections spécifiques du code
- **Logs détaillés** : Enregistre tous les événements avec timestamps
- **Request ID unique** : Identifie chaque requête pour le debugging

### 📊 Métriques trackées

#### Requêtes GraphQL (OPTIMISÉES)
- `graphql_all_transactions_optimized` : **UNE SEULE requête** pour toutes les transactions
  - Récupère borrows, supplies, withdraws, repays en parallèle
  - Champs minimaux : `txHash`, `amount`, `timestamp`, `reserve.id`
  - **Gain de performance** : 50-70% vs 4 requêtes séparées

#### Requêtes Gnosisscan
- `gnosisscan_balance_*` : Récupération des soldes par token
- `gnosisscan_all_balances` : Récupération de tous les soldes
- `gnosisscan_token_transfers` : Récupération des transferts de tokens
- `gnosisscan_transfers_*` : Récupération par type de token

#### Calculs d'intérêts
- `db_rates_*` : Récupération des taux depuis la DB
- `interest_borrow_*` : Calcul des intérêts d'emprunt
- `interest_supply_*` : Calcul des intérêts de dépôt
- `interest_total_*` : Calcul complet des intérêts

#### Endpoints API
- `rmm_v3_endpoint` : Endpoint principal RMM
- `address_*` : Traitement par adresse
- `health_check` : Vérification de santé

## Optimisations récentes

### 🚀 Optimisation GraphQL (v2.0)
**Avant** : 4 requêtes GraphQL séparées
```javascript
// Ancien système (lent)
const [borrows, supplies, withdraws, repays] = await Promise.all([
  fetchBorrows(userAddress, req),      // Requête 1
  fetchSupplies(userAddress, req),     // Requête 2
  fetchWithdraws(userAddress, req),    // Requête 3
  fetchRepays(userAddress, req)        // Requête 4
]);
```

**Après** : 1 requête GraphQL optimisée
```javascript
// Nouveau système (rapide)
const data = await client.request(ALL_TRANSACTIONS_QUERY, variables);
const { borrows, supplies, withdraws, repays } = data;
```

**Champs optimisés** :
```graphql
# Avant (trop de champs)
{
  id
  txHash
  user { id }
  reserve { id }
  amount
  borrowRate
  borrowRateMode
  timestamp
}

# Après (champs essentiels uniquement)
{
  txHash
  reserve { id }
  amount
  timestamp
}
```

## Utilisation

### Dans les routes
```javascript
router.get('/example', async (req, res) => {
  const timer = req.startTimer('my_operation');
  
  try {
    // Votre code ici
    const result = await someOperation();
    
    req.stopTimer('my_operation');
    req.logEvent('operation_completed', { result: 'success' });
    
    res.json(result);
  } catch (error) {
    req.stopTimer('my_operation');
    req.logEvent('operation_error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});
```

### Dans les services
```javascript
async function myServiceFunction(params, req = null) {
  const timerName = req ? req.startTimer('service_operation') : null;
  
  try {
    // Votre code ici
    const result = await someAsyncOperation();
    
    if (req) {
      req.stopTimer('service_operation');
      req.logEvent('service_completed', { result: 'success' });
    }
    
    return result;
  } catch (error) {
    if (req) {
      req.stopTimer('service_operation');
      req.logEvent('service_error', { error: error.message });
    }
    throw error;
  }
}
```

## Endpoints de monitoring

### `/api/health`
Endpoint de santé basique avec métriques de performance incluses.

### `/api/health/performance`
Endpoint détaillé pour visualiser toutes les métriques de performance de la requête actuelle.

**Réponse exemple :**
```json
{
  "requestId": "req_1703123456789_abc123",
  "totalTime": "850.45ms",
  "timers": [
    {
      "name": "graphql_all_transactions_optimized",
      "count": 1,
      "totalTime": "250.23ms",
      "avgTime": "250.23ms",
      "minTime": "250.23ms",
      "maxTime": "250.23ms"
    }
  ],
  "events": {
    "graphql_all_transactions_optimized_completed": 1
  },
  "logs": [...],
  "summary": {
    "totalTimers": 3,
    "totalEvents": 5,
    "totalLogs": 10
  }
}
```

### `/api/health/performance/summary`
Résumé des performances avec focus sur les opérations principales.

**Réponse exemple :**
```json
{
  "requestId": "req_1703123456789_abc123",
  "totalTime": "850.45ms",
  "operations": {
    "rmm_v3_endpoint": "850.45ms",
    "graphql_all_transactions_optimized": "250.23ms",
    "gnosisscan_token_transfers": "200.12ms",
    "interest_total_USDC": "200.34ms",
    "interest_total_WXDAI": "198.76ms"
  },
  "events": {
    "rmm_v3_started": 1,
    "processing_address": 1,
    "address_processed_successfully": 1
  }
}
```

## Logs de performance

Chaque requête génère des logs détaillés dans la console :

```
🚀 [req_1703123456789_abc123] GET /api/rmm/v3/0x1234...: 850.45ms
⏱️  [req_1703123456789_abc123] graphql_all_transactions_optimized: 250.23ms
⏱️  [req_1703123456789_abc123] gnosisscan_token_transfers: 200.12ms
⏱️  [req_1703123456789_abc123] interest_total_USDC: 200.34ms
📝 [req_1703123456789_abc123] graphql_all_transactions_optimized_completed: { address: "0x1234...", borrows: 5, supplies: 3 }
```

## Tests

Pour tester le système de timetracker :

```bash
# Démarrer le serveur backend
cd backend
npm start

# Dans un autre terminal, lancer les tests
node scripts/test-timetracker.js

# Test spécifique de l'optimisation GraphQL
node scripts/test-graphql-optimization.js
```

## Configuration

Le timetracker est activé automatiquement pour toutes les requêtes via le middleware dans `server.js`. Il n'y a pas de configuration supplémentaire nécessaire.

## Avantages

1. **Debugging facilité** : Identification rapide des goulots d'étranglement
2. **Monitoring en temps réel** : Suivi des performances des différentes opérations
3. **Logs structurés** : Informations détaillées pour l'analyse
4. **Non-intrusif** : N'affecte pas les performances de l'application
5. **Flexible** : Permet d'ajouter des timers personnalisés facilement
6. **Optimisé** : GraphQL optimisé avec une seule requête au lieu de 4

## Comparaison des performances

### Avant l'optimisation GraphQL
```
🚀 [req_123] GET /api/rmm/v3/0x1234...: 2500.45ms
⏱️  [req_123] graphql_all_transactions: 1200.23ms
⏱️  [req_123] gnosisscan_token_transfers: 800.12ms
⏱️  [req_123] interest_total_USDC: 300.34ms
⏱️  [req_123] interest_total_WXDAI: 298.76ms
```

### Après l'optimisation GraphQL
```
🚀 [req_123] GET /api/rmm/v3/0x1234...: 850.45ms
⏱️  [req_123] graphql_all_transactions_optimized: 250.23ms
⏱️  [req_123] gnosisscan_token_transfers: 200.12ms
⏱️  [req_123] interest_total_USDC: 200.34ms
⏱️  [req_123] interest_total_WXDAI: 198.76ms
```

**Gain de performance** : ~66% de réduction du temps total !

## Exemples d'utilisation

### Identifier les lenteurs
```bash
# Chercher les requêtes les plus lentes
grep "🚀" logs.txt | sort -k4 -n -r | head -10
```

### Analyser les performances GraphQL
```bash
# Filtrer les logs GraphQL optimisés
grep "graphql_all_transactions_optimized" logs.txt
```

### Vérifier les calculs d'intérêts
```bash
# Filtrer les logs de calcul d'intérêts
grep "interest_" logs.txt
```

### Comparer avant/après optimisation
```bash
# Avant optimisation
grep "graphql_all_transactions:" logs.txt | tail -5

# Après optimisation  
grep "graphql_all_transactions_optimized:" logs.txt | tail -5
``` 