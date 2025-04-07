# Calculs d'intérêts RMM

## Formules

### Taux journalier
```
taux_journalier = taux_annuel / 365
```

### Calcul des intérêts composés
Pour chaque jour J :
```
Montant_J+1 = Montant_J * (1 + taux_journalier)
```

## Processus de calcul

1. **Initialisation**
   - Date de début : veille du premier emprunt à minuit
   - Montant initial : montant du premier emprunt

2. **Pour chaque jour**
   - Récupérer le taux d'intérêt du jour via l'API RMM
   - Calculer le taux journalier
   - Appliquer la formule de capitalisation
   - Stocker le coût journalier

3. **Événements**
   - En cas d'emprunt : ajouter le montant au capital
   - En cas de remboursement : soustraire le montant du capital

4. **Tableau des coûts**
   ```typescript
   interface DailyCost {
     date: Date;
     amount: number;
     rate: number;
     dailyInterest: number;
     cumulativeInterest: number;
   }
   ```

## Exemple de calcul

```typescript
// Pseudo-code
const calculateInterest = (borrowAmount: number, startDate: Date, endDate: Date) => {
  const dailyCosts: DailyCost[] = [];
  let currentAmount = borrowAmount;
  let cumulativeInterest = 0;

  for (let date = startDate; date <= endDate; date.addDays(1)) {
    const dailyRate = getDailyRate(date); // Récupéré via l'API
    const dailyInterest = currentAmount * dailyRate;
    cumulativeInterest += dailyInterest;
    currentAmount *= (1 + dailyRate);

    dailyCosts.push({
      date,
      amount: currentAmount,
      rate: dailyRate,
      dailyInterest,
      cumulativeInterest
    });
  }

  return dailyCosts;
};
```

## Notes importantes
- Les taux sont exprimés en décimal (0-1)
- Les calculs sont faits avec une granularité journalière
- Les intérêts sont capitalisés quotidiennement
- Les événements (emprunts/remboursements) sont pris en compte immédiatement 