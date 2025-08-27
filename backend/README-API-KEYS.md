# 🔑 Configuration des Clés API

## Clés API requises

### 1. GnosisScan API Key
**Obligatoire** pour les routes `/api/balances/*`

#### Comment obtenir la clé :
1. Aller sur [https://gnosisscan.io/](https://gnosisscan.io/)
2. Créer un compte gratuit
3. Aller dans "API-KEYs" dans votre profil
4. Créer une nouvelle clé API

#### Configuration :
```bash
# Dans le fichier .env du backend
GNOSISSCAN_API_KEY=votre_cle_api_ici
```

### 2. TheGraph API Key (optionnel)
**Recommandé** pour éviter les rate limits

#### Comment obtenir la clé :
1. Aller sur [https://thegraph.com/](https://thegraph.com/)
2. Créer un compte
3. Aller dans "API Keys"
4. Créer une nouvelle clé

#### Configuration :
```bash
# Dans le fichier .env du backend
THEGRAPH_API_KEY=votre_cle_api_ici
```

## Routes disponibles

### API V2 (Etherscan/GnosisScan moderne)
```
GET /api/balances/v2/:address
```
- Plus rapide
- Headers optimisés
- Gestion d'erreurs améliorée

### API V3 (Optimisée)
```
GET /api/balances/v3/:address
```
- Un seul appel API
- Pas de délai artificiel
- Performance maximale

## Test de performance

Pour comparer les performances des différentes APIs :

```bash
cd backend
npm run test-balances
```

Cela testera les deux versions et recommandera la plus rapide.

## Rate Limits

### GnosisScan
- **Gratuit** : 5 appels/seconde
- **Payant** : 100 appels/seconde

### TheGraph
- **Gratuit** : 1000 appels/jour
- **Payant** : Limites personnalisées


## Recommandations

1. **Pour la production** : Utilisez toutes les clés API
2. **Pour le développement** : GnosisScan suffit
3. **Pour les tests** : Utilisez le script de performance

## Dépannage

### Erreur "API Key required"
```bash
# Vérifiez que la clé est bien dans .env
echo $GNOSISSCAN_API_KEY
```

### Erreur "Rate limit exceeded"
- Attendez quelques secondes
- Vérifiez vos limites d'API
- Utilisez le cache si disponible

### Erreur "Invalid address"
- Vérifiez le format de l'adresse (0x...)
- Assurez-vous que l'adresse existe sur Gnosis Chain 