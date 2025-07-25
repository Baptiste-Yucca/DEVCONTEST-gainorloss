# RMM SupplyTokens Subgraph

Ce subgraph capture uniquement les transferts des deux SupplyTokens RMM sur Gnosis Chain :
- **armmUSDC** : `0xed56f76e9cbc6a64b821e9c016eafbd3db5436d1`
- **armmWXDAI** : `0x0ca4f5554dd9da6217d62d8df2816c82bba4157b`

## Objectif

Capturer tous les transferts réussis de SupplyTokens entre utilisateurs pour avoir une vue complète des mouvements de tokens, même ceux qui ne passent pas directement par les événements `Supply`/`Withdraw` du protocole.

## Fonctionnalités

### Événements capturés

- **Transfer** : Tous les transferts réussis de armmUSDC et armmWXDAI
- **Filtrage** : Seuls les transferts avec des transactions réussies sont capturés

### Informations stockées

Pour chaque transfert :
- `from` : Adresse de l'expéditeur
- `to` : Adresse du destinataire  
- `amount` : Montant transféré
- `hashId` : Hash de la transaction
- `timestamp` : Timestamp du bloc
- `token` : Nom du token (armmUSDC ou armmWXDAI)

## Installation et déploiement

### Prérequis

```bash
npm install -g @graphprotocol/graph-cli
```

### Configuration

- **StartBlock** : 32074630 (déjà configuré)
- **Network** : Gnosis Chain
- **Tokens** : armmUSDC et armmWXDAI

### Développement local

```bash
# Installer les dépendances
npm install

# Générer les types
npm run codegen

# Construire le subgraph
npm run build

# Déployer localement (nécessite un nœud Graph local)
npm run deploy-local
```

### Déploiement sur TheGraph Studio

```bash
# Déployer sur TheGraph Studio
npm run deploy
```

## Utilisation

### Requêtes GraphQL

```graphql
# Obtenir tous les transferts de armmUSDC
{
  transfers(where: { token: "armmUSDC" }, orderBy: timestamp, orderDirection: desc) {
    id
    from
    to
    amount
    hashId
    timestamp
    token
  }
}

# Obtenir les transferts d'une adresse spécifique
{
  transfers(where: { from: "0x..." }, orderBy: timestamp, orderDirection: desc) {
    id
    from
    to
    amount
    hashId
    timestamp
    token
  }
}

# Obtenir les transferts récents
{
  transfers(orderBy: timestamp, orderDirection: desc, first: 10) {
    id
    from
    to
    amount
    hashId
    timestamp
    token
  }
}
```

## Structure des fichiers

```
subgraph/
├── abis/
│   └── ERC20.json        # ABI ERC20 standard
├── src/
│   └── mapping.ts        # Mapping pour les transferts
├── schema.graphql        # Schéma GraphQL simplifié
├── subgraph.yaml         # Configuration avec les deux tokens
├── package.json          # Dépendances et scripts
└── README.md             # Documentation
```

## Notes importantes

- Seuls les transferts avec des transactions **réussies** sont capturés
- Les adresses des tokens sont hardcodées pour armmUSDC et armmWXDAI
- Le subgraph commence à indexer depuis le bloc 32074630
- Pas de capture des événements RMM (Supply/Withdraw) car déjà gérés par un autre subgraph 