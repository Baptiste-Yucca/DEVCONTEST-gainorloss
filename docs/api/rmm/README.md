# API RMM (RealToken Money Market)

## Endpoints

### Historique des taux
```
GET https://rmm-api.realtoken.network/data/rates-history
```

#### Paramètres
- `reserveId` : Concaténation de l'adresse du token et de la pool de réserve
- `from` : Timestamp de début (epoch)
- `resolutionInHours` : Granularité (24 pour un jour)

#### Exemples de reserveId
- USDC : `0xddafbb505ad214d7b80b1f830fccc89b60fb7a830xdaa06cf7adceb69fcfde68d896818b9938984a70`
- WXDAI : `0xe91d153e0b41518a2ce8dd3d7944fa863463a97d0xdaa06cf7adceb69fcfde68d896818b9938984a70`

#### Format de réponse
```json
{
    "liquidityRate_avg": 0.076958830006516,    // Taux de dépôt
    "variableBorrowRate_avg": 0.118741940645401, // Taux d'emprunt variable
    "utilizationRate_avg": 0.828559093055556,   // Taux d'utilisation
    "x": {
      "year": 2025,
      "month": 0,    // 0-11
      "date": 1,     // 1-31
      "hours": 0
    }
}
```

## Notes importantes
- Le RMM a été lancé le 24 janvier 2024 (timestamp: 1706061525)
- Les mois sont de 0 à 11 (0-11)
- Les jours sont de 1 à 31 (1-31)
- Les taux sont exprimés en décimal (0-1)
- Pas d'authentification requise 