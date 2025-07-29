import { Transaction } from '../types/transaction';

// Interface pour les taux journaliers - compatible avec l'existant
export interface DailyRate {
  liquidityRate_avg: number;
  variableBorrowRate_avg: number;
  utilizationRate_avg: number;
  x: {
    year: number;
    month: number;
    date: number;
    hours: number;
  };
  timestamp: number;
}

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

// Fonctions utilitaires
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

// Fonction pour générer un CSV
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