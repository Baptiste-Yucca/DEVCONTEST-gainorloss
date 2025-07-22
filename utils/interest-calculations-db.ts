import { Transaction } from '../types/transaction';
import * as path from 'path';

// Interface pour les taux journaliers - compatible avec l'existant
export interface DailyRate {
  liquidityRate_avg: number;
  variableBorrowRate_avg: number;
  utilizationRate_avg: number;
  stableBorrowRate_avg: number;
  x: {
    year: number;
    month: number;
    date: number;
    hours: number;
  };
  timestamp: number;
}

// Interfaces pour les résultats - compatible avec l'existant
export interface DailyCost {
  date: string;
  timestamp: number;
  debtAmount: number;
  dailyRate: number;
  apr: number;
  dailyInterest: number;
  cumulativeInterest: number;
}

export interface DailyCostDetail {
  date: string;
  timestamp: number;
  debtAmount: number;
  dailyRate: number;
  apr: number;
  dailyInterest: number;
  cumulativeInterest: number;
}

/**
 * Récupère les taux depuis la base de données SQLite
 */
export const fetchAllInterestRatesFromDB = async (token: 'USDC' | 'WXDAI', fromTimestamp: number): Promise<Map<string, DailyRate>> => {
  try {
    // Convertir le timestamp en date YYYYMMDD
    const fromDate = new Date(fromTimestamp * 1000);
    const year = fromDate.getFullYear();
    const month = String(fromDate.getMonth() + 1).padStart(2, '0');
    const day = String(fromDate.getDate()).padStart(2, '0');
    const fromDateStr = `${year}${month}${day}`;
    
    console.log(`⚠️ Récupération des taux depuis la DB pour ${token} à partir de ${fromDateStr}`);
    
    // Utiliser l'API Node.js pour accéder à la base de données
    const response = await fetch('/api/rates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        fromDate: fromDateStr
      })
    });
    
    if (!response.ok) {
      throw new Error(`Erreur lors de la récupération des taux depuis la DB: ${response.statusText}`);
    }
    
    const dbRows = await response.json();
    console.log(`⚠️ ${dbRows.length} taux récupérés depuis la base de données`);
    
    // Convertir les données de la DB au format attendu
    const ratesByDate = new Map<string, DailyRate>();
    
    dbRows.forEach((row: any) => {
             // Reconstituer l'objet DailyRate au format attendu
       const dailyRate: DailyRate = {
         liquidityRate_avg: row.liquidity_rate_avg || 0,
         variableBorrowRate_avg: row.variable_borrow_rate_avg || 0,
         utilizationRate_avg: row.utilization_rate_avg || 0,
         stableBorrowRate_avg: row.stable_borrow_rate_avg || 0,
         x: {
           year: row.year,
           month: row.month - 1, // Reconvertir du format humain (1-12) vers JavaScript (0-11)
           date: row.day,
           hours: 0
         },
         timestamp: row.timestamp
       };
      
      // Vérifier que le taux est bien défini et non nul
      if (!dailyRate.variableBorrowRate_avg || dailyRate.variableBorrowRate_avg === 0) {
        console.warn(`⚠️ Taux nul ou non défini pour ${row.date}`);
        return; // Ignorer cette entrée
      }
      
      console.log(`Taux pour ${row.date}: ${(dailyRate.variableBorrowRate_avg * 100).toFixed(6)}%`);
      
      // Stocker le taux avec la clé de date
      ratesByDate.set(row.date, dailyRate);
    });
    
    console.log(`⚠️ ${ratesByDate.size} taux journaliers uniques récupérés depuis la DB`);
    
    return ratesByDate;
    
  } catch (error) {
    console.error('Erreur lors de la récupération des taux depuis la DB:', error);
    throw error;
  }
};

/**
 * Fonction pour calculer les intérêts en utilisant la base de données
 */
export const calculateInterestFromDB = async (
  transactions: Transaction[],
  token: 'USDC' | 'WXDAI'
): Promise<{ dailyCosts: DailyCost[], dailyDetails: DailyCostDetail[] }> => {
  const dailyCosts: DailyCost[] = [];
  const dailyDetails: DailyCostDetail[] = [];
  
  // Si pas de transactions, retourner des tableaux vides
  if (transactions.length === 0) {
    return { dailyCosts: [], dailyDetails: [] };
  }
  
  // Trier les transactions par date (plus ancienne en premier)
  const sortedTransactions = [...transactions].sort((a, b) => a.timestamp - b.timestamp);
  
  // Définir la plage de dates (du plus ancien au plus récent)
  const startDate = getPreviousDayMidnight(sortedTransactions[0].timestamp);
  const endDate = Math.floor(Date.now() / 1000); // Aujourd'hui
  
  // Récupérer tous les taux d'intérêt depuis la base de données
  console.log(`Récupération des taux depuis la DB pour ${token} du ${new Date(startDate * 1000).toISOString()} à aujourd'hui`);
  const allRates = await fetchAllInterestRatesFromDB(token, startDate);
  console.log(`${allRates.size} taux journaliers récupérés depuis la DB pour ${token}`);
  
  // Créer un tableau de jours pour le calcul (du début à la fin)
  const days = [];
  for (let currentDate = startDate; currentDate <= endDate; currentDate += 86400) {
    days.push(currentDate);
  }
  
  // Calculer les intérêts jour par jour
  let currentAmount = 0;
  let cumulativeInterest = 0;
  
  for (const currentDate of days) {
    const dateKey = formatDateYYYYMMDD(currentDate);
    
    // Mettre à jour les montants pour les transactions de ce jour
    const dayTransactions = sortedTransactions.filter(tx => 
      getPreviousDayMidnight(tx.timestamp) === currentDate
    );
    
    dayTransactions.forEach(tx => {
      if (tx.transactionType === 'borrow') {
        currentAmount += parseFloat(tx.amount);
      } else if (tx.transactionType === 'repay') {
        currentAmount -= parseFloat(tx.amount);
      }
    });
    
    // Pour l'instant, ne traiter que l'USDC comme demandé
    if (token === 'USDC' && currentAmount > 0) {
      const dailyRate = allRates.get(dateKey);
      
      if (dailyRate) {
        const dailyRateValue = dailyRate.variableBorrowRate_avg / 365;
        const dailyInterest = currentAmount * dailyRateValue;
        cumulativeInterest += dailyInterest;
        
                 // Stocker les résultats
         const dailyCost: DailyCost = {
           date: dateKey,
           timestamp: currentDate,
           debtAmount: currentAmount,
           dailyRate: dailyRateValue,
           apr: dailyRate.variableBorrowRate_avg * 100,
           dailyInterest,
           cumulativeInterest
         };
         dailyCosts.push(dailyCost);
         
         // Stocker les détails journaliers avec le montant de la dette et le taux
         dailyDetails.push({
           date: dateKey,
           timestamp: currentDate,
           debtAmount: currentAmount,
           dailyRate: dailyRateValue,
           apr: dailyRate.variableBorrowRate_avg * 100,
           dailyInterest,
           cumulativeInterest
         });
        
        console.log(`${dateKey}: Dette=${currentAmount.toFixed(2)}, Taux=${(dailyRateValue * 100).toFixed(4)}%, Intérêt=${dailyInterest.toFixed(6)}`);
      } else {
        console.warn(`Pas de taux disponible pour ${dateKey}`);
      }
    }
  }
  
  return { dailyCosts, dailyDetails };
};

/**
 * Fonction améliorée pour calculer les intérêts de la dette précisément jour par jour (utilisant la DB)
 */
export const calculateDailyDebtWithInterestFromDB = async (
  transactions: Transaction[],
  token: 'USDC' | 'WXDAI',
  fromTimestamp: number
): Promise<{ 
  dailyDebtDetails: Array<{
    date: string;
    timestamp: number;
    debt: number;
    dailyRate: number;
    apr: number;
    dailyInterest: number;
    totalInterest: number;
    transactionAmount: number | null;
    transactionType: string | null;
  }>;
  totalInterest: number;
}> => {
  console.log(`Calcul précis de la dette pour ${token} depuis ${new Date(fromTimestamp * 1000).toISOString()} (utilisant la DB)`);
  
  // Récupérer tous les taux d'intérêt depuis la base de données
  const allRates = await fetchAllInterestRatesFromDB(token, fromTimestamp);
  console.log(`${allRates.size} taux journaliers récupérés depuis la DB pour ${token}`);
  
  // Créer un tableau pour stocker tous les taux avec leur date au format YYYYMMDD
  const allRatesArray: Array<{ date: string; rate: DailyRate }> = [];
  allRates.forEach((rate, dateKey) => {
    allRatesArray.push({ date: dateKey, rate });
  });
  
  // Afficher les taux pour vérification
  console.log("⚠️ LISTE COMPLÈTE DES TAUX DISPONIBLES DEPUIS LA DB:");
  allRatesArray.forEach(({ date, rate }) => {
    console.log(`${date}: ${(rate.variableBorrowRate_avg * 100).toFixed(6)}%`);
  });
  
  // Trier les transactions (emprunts et remboursements) par ordre chronologique
  const debtTransactions = transactions
    .filter(tx => tx.transactionType === 'borrow' || tx.transactionType === 'repay')
    .sort((a, b) => a.timestamp - b.timestamp);
  
  console.log(`⚠️ TRANSACTIONS TROUVÉES: ${debtTransactions.length}`);
  
  if (debtTransactions.length === 0) {
    console.log(`Aucune transaction d'emprunt/remboursement pour ${token}`);
    return { dailyDebtDetails: [], totalInterest: 0 };
  }
  
  // Déterminer la période de calcul
  const startTimestamp = Math.min(fromTimestamp, debtTransactions[0].timestamp);
  const endTimestamp = Math.floor(Date.now() / 1000);
  
  console.log(`Période de calcul: ${new Date(startTimestamp * 1000).toISOString()} → ${new Date(endTimestamp * 1000).toISOString()}`);
  
  // Variables pour le calcul jour par jour
  let currentDebt = 0;
  let totalInterest = 0;
  const dailyDebtDetails: any[] = [];
  
  // Fonction pour gérer l'absence de taux
  const handleMissingRate = (
    dateKey: string, 
    currentDate: number, 
    currDebt: number
  ): void => {
    console.warn(`⚠️ Pas de taux disponible pour ${dateKey}, dette active: ${currDebt.toFixed(6)} - Aucun calcul d'intérêt effectué`);
  };
  
  // Calculer jour par jour
  for (let currentDate = startTimestamp; currentDate <= endTimestamp; currentDate += 86400) {
    const formattedDate = new Date(currentDate * 1000).toLocaleDateString('fr-FR');
    const year = new Date(currentDate * 1000).getFullYear();
    const month = String(new Date(currentDate * 1000).getMonth() + 1).padStart(2, '0');
    const day = String(new Date(currentDate * 1000).getDate()).padStart(2, '0');
    const dateKey = `${year}${month}${day}`;
    
    let transactionAmount: number | null = null;
    let transactionType: string | null = null;
    
    // Vérifier s'il y a des transactions ce jour-là
    const dayTransactions = debtTransactions.filter(tx => {
      const txDate = new Date(tx.timestamp * 1000);
      const txDateKey = `${txDate.getFullYear()}${String(txDate.getMonth() + 1).padStart(2, '0')}${String(txDate.getDate()).padStart(2, '0')}`;
      return txDateKey === dateKey;
    });
    
    // Appliquer les transactions du jour (s'il y en a)
    if (dayTransactions.length > 0) {
      console.log(`${formattedDate}: ${dayTransactions.length} transactions trouvées`);
      
      for (const tx of dayTransactions) {
        // Pour USDC (6 décimales), convertir correctement
        let amount = 0;
        if (token === 'USDC') {
          // Les montants sont déjà en tokens dans les transactions API
          amount = parseFloat(tx.amount);
          console.log(`⚠️ Transaction ${tx.transactionType} brute: ${tx.amount} -> sans conversion: ${amount.toFixed(6)} ${token}`);
        } else {
          // Pour WXDAI (18 décimales)
          amount = parseFloat(tx.amount) / 1e18;
          console.log(`Transaction ${tx.transactionType}: ${amount.toFixed(6)} ${token}`);
        }
        
        if (tx.transactionType === 'borrow') {
          currentDebt += amount;
          transactionAmount = amount;
          transactionType = 'borrow';
        } else if (tx.transactionType === 'repay') {
          currentDebt -= amount;
          transactionAmount = amount;
          transactionType = 'repay';
        }
      }
      
      // Ajuster la dette s'il y a eu un remboursement excessif
      if (currentDebt < 0) {
        console.warn(`Dette négative après remboursement le ${formattedDate}, ajustement à 0`);
        currentDebt = 0;
      }
    }
    
    // Récupérer le taux du jour depuis la base de données
    console.log(`⚠️ Recherche de taux pour la date ${dateKey} (${formattedDate})`);
    const dailyRate = allRates.get(dateKey);
    
    if (dailyRate) {
      console.log(`⚠️ TROUVÉ: Taux pour ${dateKey} = ${(dailyRate.variableBorrowRate_avg * 100).toFixed(6)}%`);
    } else {
      console.log(`⚠️ NON TROUVÉ: Aucun taux pour ${dateKey}`);
    }
    
    if (dailyRate && currentDebt > 0) {
      // Le taux est bien défini, l'utiliser pour le calcul
      const rateValue = dailyRate.variableBorrowRate_avg;
      const aprPercentage = rateValue * 100; // APR en pourcentage
      const dailyRateValue = rateValue / 365;
      const dailyInterest = currentDebt * dailyRateValue;
      
      console.log(`⚠️ ${formattedDate}: Dette=${currentDebt.toFixed(6)} ${token}, APR=${aprPercentage.toFixed(6)}%, Taux journalier=${(dailyRateValue * 100).toFixed(6)}%, Intérêt=${dailyInterest.toFixed(6)} ${token}`);
      
      // Ajouter l'intérêt à la dette et au total
      currentDebt += dailyInterest;
      totalInterest += dailyInterest;
      
      // Enregistrer les détails du jour
      dailyDebtDetails.push({
        date: dateKey,
        timestamp: currentDate,
        debt: currentDebt,
        dailyRate: dailyRateValue,
        apr: aprPercentage,
        dailyInterest,
        totalInterest,
        transactionAmount,
        transactionType
      });
    } else if (currentDebt > 0) {
      // Si le taux n'est pas disponible pour ce jour spécifique, chercher un taux proche
      console.warn(`⚠️ Pas de taux disponible pour ${dateKey} (${formattedDate}), dette active: ${currentDebt.toFixed(6)}`);
      
      // Trouver la date la plus proche parmi les taux disponibles
      let nearestDate = '';
      let minDiff = Number.MAX_VALUE;
      
      allRatesArray.forEach(({ date, rate }) => {
        // Convertir les deux dates en format YYYY-MM-DD pour comparaison
        const currentYear = dateKey.substring(0, 4);
        const currentMonth = dateKey.substring(4, 6);
        const currentDay = dateKey.substring(6, 8);
        const currentFullDate = `${currentYear}-${currentMonth}-${currentDay}`;
        
        const rateYear = date.substring(0, 4);
        const rateMonth = date.substring(4, 6);
        const rateDay = date.substring(6, 8);
        const rateFullDate = `${rateYear}-${rateMonth}-${rateDay}`;
        
        // Calculer la différence en jours
        const d1 = new Date(currentFullDate);
        const d2 = new Date(rateFullDate);
        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < minDiff) {
          minDiff = diffDays;
          nearestDate = date;
        }
      });
      
      if (nearestDate && minDiff <= 7) { // Ne prendre que les dates à moins d'une semaine
        const alternativeRate = allRates.get(nearestDate);
        if (alternativeRate) {
          const rateValue = alternativeRate.variableBorrowRate_avg;
          const aprPercentage = rateValue * 100;
          const dailyRateValue = rateValue / 365;
          const dailyInterest = currentDebt * dailyRateValue;
          
          console.log(`⚠️ Utilisation du taux de la date la plus proche (${nearestDate}, diff=${minDiff} jours): ${aprPercentage.toFixed(6)}%`);
          
          // Ajouter l'intérêt à la dette et au total
          currentDebt += dailyInterest;
          totalInterest += dailyInterest;
          
          // Enregistrer les détails du jour avec le taux alternatif
          dailyDebtDetails.push({
            date: dateKey,
            timestamp: currentDate,
            debt: currentDebt,
            dailyRate: dailyRateValue,
            apr: aprPercentage,
            dailyInterest,
            totalInterest,
            transactionAmount,
            transactionType
          });
        } else {
          console.error(`⚠️ Erreur inattendue: taux alternatif non trouvé pour ${nearestDate}`);
          // Pas de taux disponible
          handleMissingRate(dateKey, currentDate, currentDebt);
        }
      } else {
        // Si aucun taux proche n'est trouvé, pas de calcul d'intérêt
        handleMissingRate(dateKey, currentDate, currentDebt);
      }
    }
  }
  
  console.log(`⚠️ Calcul terminé: ${dailyDebtDetails.length} jours, total des intérêts: ${totalInterest.toFixed(6)} ${token}`);
  
  return { dailyDebtDetails, totalInterest };
};

// Fonctions utilitaires (reprises de l'original)
function getPreviousDayMidnight(timestamp: number): number {
  const date = new Date(timestamp * 1000);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - 1);
  return Math.floor(date.getTime() / 1000);
}

function formatDateYYYYMMDD(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// Fonction pour calculer le coût total des intérêts
export const calculateTotalInterestCost = (dailyCosts: number[]): number => {
  if (dailyCosts.length === 0) return 0;
  return dailyCosts[dailyCosts.length - 1];
};

// Fonction pour générer un CSV (reprise de l'original)
export const generateDailyCostsCSV = (usdcDetails: DailyCostDetail[], wxdaiDetails: DailyCostDetail[]): string => {
  const headers = 'Date,Token,Dette,Taux Journalier (%),APR (%),Intérêt Journalier,Intérêt Cumulé\n';
  
  const rows: string[] = [];
  
  // Ajouter les données USDC
  usdcDetails.forEach(detail => {
    const year = detail.date.substring(0, 4);
    const month = detail.date.substring(4, 6);
    const day = detail.date.substring(6, 8);
    const formattedDate = `${year}-${month}-${day}`;
    
    rows.push([
      formattedDate,
      'USDC',
      detail.debtAmount.toFixed(6),
      (detail.dailyRate * 100).toFixed(6),
      detail.apr.toFixed(6),
      detail.dailyInterest.toFixed(6),
      detail.cumulativeInterest.toFixed(6)
    ].join(','));
  });
  
  // Ajouter les données WXDAI
  wxdaiDetails.forEach(detail => {
    const year = detail.date.substring(0, 4);
    const month = detail.date.substring(4, 6);
    const day = detail.date.substring(6, 8);
    const formattedDate = `${year}-${month}-${day}`;
    
    rows.push([
      formattedDate,
      'WXDAI',
      detail.debtAmount.toFixed(6),
      (detail.dailyRate * 100).toFixed(6),
      detail.apr.toFixed(6),
      detail.dailyInterest.toFixed(6),
      detail.cumulativeInterest.toFixed(6)
    ].join(','));
  });
  
  return headers + rows.join('\n');
}; 