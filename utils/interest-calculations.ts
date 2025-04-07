import { Transaction } from '../types/transaction';
import { DailyRate, DailyCostDetail, DailyCost } from '../types/interest';
import { fetchRmmRates } from './api/rmm-api/rates';

// Constantes pour les reserveId
const RESERVE_IDS = {
  USDC: '0xddafbb505ad214d7b80b1f830fccc89b60fb7a830xdaa06cf7adceb69fcfde68d896818b9938984a70',
  WXDAI: '0xe91d153e0b41518a2ce8dd3d7944fa863463a97d0xdaa06cf7adceb69fcfde68d896818b9938984a70'
};

// Fonction pour récupérer tous les taux d'intérêt sur une période
export const fetchAllInterestRates = async (reserveId: string, fromTimestamp: number): Promise<DailyRate[]> => {
  try {
    console.log("⚠️ Récupération des taux d'intérêt...");
    const rates = await fetchRmmRates(reserveId, fromTimestamp);
    
    if (!rates || rates.length === 0) {
      throw new Error("Aucun taux d'intérêt trouvé");
    }

    console.log(`⚠️ ${rates.length} taux d'intérêt récupérés`);
    return rates;
  } catch (error) {
    console.error("⚠️ Erreur lors de la récupération des taux:", error);
    throw error;
  }
};

// Fonction pour formater la date au format YYYYMMDD
export const formatDateYYYYMMDD = (timestamp: number): string => {
  try {
    // Vérifier que le timestamp est valide
    if (!timestamp || timestamp <= 0 || timestamp > 9999999999) {
      console.warn(`⚠️ formatDateYYYYMMDD: Timestamp invalide: ${timestamp}`);
      return 'invalide';
    }
    
    const date = new Date(timestamp * 1000);
    
    // Vérifier que la date est valide
    if (isNaN(date.getTime())) {
      console.warn(`⚠️ formatDateYYYYMMDD: Date invalide pour timestamp: ${timestamp}`);
      return 'invalide';
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  } catch (error) {
    console.error(`⚠️ Erreur dans formatDateYYYYMMDD pour timestamp ${timestamp}:`, error);
    return 'invalide';
  }
};

// Fonction pour obtenir le timestamp de la veille à minuit
export const getPreviousDayMidnight = (timestamp: number): number => {
  try {
    // Vérifier que le timestamp est valide
    if (!timestamp || timestamp <= 0 || timestamp > 9999999999) {
      console.warn(`⚠️ getPreviousDayMidnight: Timestamp invalide: ${timestamp}`);
      return Math.floor(Date.now() / 1000) - 86400; // Utiliser hier comme valeur par défaut
    }
    
    const date = new Date(timestamp * 1000);
    
    // Vérifier que la date est valide
    if (isNaN(date.getTime())) {
      console.warn(`⚠️ getPreviousDayMidnight: Date invalide pour timestamp: ${timestamp}`);
      return Math.floor(Date.now() / 1000) - 86400; // Utiliser hier comme valeur par défaut
    }
    
    date.setHours(0, 0, 0, 0);
    return Math.floor(date.getTime() / 1000);
  } catch (error) {
    console.error(`⚠️ Erreur dans getPreviousDayMidnight pour timestamp ${timestamp}:`, error);
    return Math.floor(Date.now() / 1000) - 86400; // Utiliser hier comme valeur par défaut
  }
};

// Nouvelle fonction pour comparer deux dates (ignorer l'heure)
export const isSameDay = (timestamp1: number, timestamp2: number): boolean => {
  try {
    // Vérifier que les timestamps sont valides
    if (!timestamp1 || !timestamp2 || 
        timestamp1 <= 0 || timestamp2 <= 0 || 
        timestamp1 > 9999999999 || timestamp2 > 9999999999) {
      console.warn(`⚠️ isSameDay: Timestamps invalides: ${timestamp1}, ${timestamp2}`);
      return false;
    }
    
    const date1 = new Date(timestamp1 * 1000);
    const date2 = new Date(timestamp2 * 1000);
    
    // Vérifier que les dates sont valides
    if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
      console.warn(`⚠️ isSameDay: Dates invalides pour timestamps: ${timestamp1}, ${timestamp2}`);
      return false;
    }
    
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  } catch (error) {
    console.error(`⚠️ Erreur dans isSameDay pour timestamps ${timestamp1}, ${timestamp2}:`, error);
    return false;
  }
};

// Fonction pour calculer les intérêts sur une période
export const calculateInterest = async (
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
  
  // Récupérer tous les taux d'intérêt en une seule fois
  console.log(`Récupération des taux pour ${token} du ${new Date(startDate * 1000).toISOString()} à aujourd'hui`);
  const allRates = await fetchAllInterestRates(RESERVE_IDS[token], startDate);
  console.log(`${allRates.length} taux journaliers récupérés pour ${token}`);
  
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
      const dailyRate = allRates.find(rate => formatDateYYYYMMDD(rate.timestamp) === dateKey);
      
      if (dailyRate) {
        const dailyRateValue = dailyRate.variableBorrowRate_avg / 365;
        const dailyInterest = currentAmount * dailyRateValue;
        cumulativeInterest += dailyInterest;
        
        // Stocker les résultats
        dailyCosts.push(cumulativeInterest);
        
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

// Fonction pour calculer le coût total des intérêts
export const calculateTotalInterestCost = (dailyCosts: DailyCost[]): number => {
  if (dailyCosts.length === 0) return 0;
  return dailyCosts[dailyCosts.length - 1];
};

// Fonction pour générer un CSV des coûts journaliers
export const generateDailyCostsCSV = (
  usdcDailyDetails: DailyCostDetail[],
  wxdaiDailyDetails: DailyCostDetail[]
): string => {
  // Combiner les dates des deux tokens
  const allDates = new Set<string>();
  usdcDailyDetails.forEach(detail => allDates.add(detail.date));
  wxdaiDailyDetails.forEach(detail => allDates.add(detail.date));
  
  // Trier les dates
  const sortedDates = Array.from(allDates).sort();
  
  // Créer un map pour accéder rapidement aux détails par date
  const usdcDetailsByDate = new Map<string, DailyCostDetail>();
  const wxdaiDetailsByDate = new Map<string, DailyCostDetail>();
  
  usdcDailyDetails.forEach(detail => usdcDetailsByDate.set(detail.date, detail));
  wxdaiDailyDetails.forEach(detail => wxdaiDetailsByDate.set(detail.date, detail));
  
  // Générer l'en-tête du CSV
  let csv = 'Date,Coût USDC,Coût WXDAI\n';
  
  // Générer les lignes du CSV
  sortedDates.forEach(date => {
    const usdcDetail = usdcDetailsByDate.get(date);
    const wxdaiDetail = wxdaiDetailsByDate.get(date);
    
    const usdcCost = usdcDetail ? usdcDetail.dailyInterest.toFixed(6) : '0';
    const wxdaiCost = wxdaiDetail ? wxdaiDetail.dailyInterest.toFixed(6) : '0';
    
    csv += `${date},${usdcCost},${wxdaiCost}\n`;
  });
  
  return csv;
};

// Fonction pour afficher directement les taux (à utiliser pour débogage)
export const displayRawRates = async (token: 'USDC' | 'WXDAI', fromTimestamp: number): Promise<void> => {
  try {
    const reserveId = RESERVE_IDS[token];
    const url = `https://rmm-api.realtoken.network/data/rates-history?reserveId=${reserveId}&from=${fromTimestamp}&resolutionInHours=24`;
    console.log("Récupération des taux bruts pour", token, "depuis", new Date(fromTimestamp * 1000).toISOString());
    console.log("URL de l'API:", url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Erreur lors de la récupération des taux: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log("Données brutes des taux:", data);
    console.log("Nombre de jours avec des taux:", data.length);
    
    // Afficher chaque entrée pour mieux comprendre le format
    if (data.length > 0) {
      console.log("Premier taux:", data[0]);
      console.log("Dernier taux:", data[data.length - 1]);
      
      // Afficher quelques taux particuliers pour vérifier
      data.forEach((rate: any) => {
        if (rate.year === 2 && rate.month === 2 && rate.day === 31) { // Mars (31 mars)
          console.log("Taux du 31 mars:", rate);
        }
      });
    } else {
      console.log("Aucun taux retourné par l'API");
    }
    
    return;
  } catch (error) {
    console.error("Erreur lors de l'affichage des taux bruts:", error);
  }
};

// Fonction améliorée pour calculer les intérêts de la dette précisément jour par jour
export const calculateDailyDebtWithInterest = async (
  transactions: Transaction[],
  token: 'USDC' | 'WXDAI',
  fromTimestamp: number
): Promise<{ 
  dailyDebtDetails: Array<{
    date: string;
    timestamp: number;
    debt: number;
    dailyRate: number;
    apr: number; // Ajouté: taux annuel en %
    dailyInterest: number;
    totalInterest: number;
    transactionAmount: number | null;
    transactionType: string | null;
  }>;
  totalInterest: number;
}> => {
  console.log(`Calcul précis de la dette pour ${token} depuis ${new Date(fromTimestamp * 1000).toISOString()}`);
  
  // Récupérer tous les taux d'intérêt en une seule fois
  const allRates = await fetchAllInterestRates(RESERVE_IDS[token], fromTimestamp);
  console.log(`${allRates.length} taux journaliers récupérés pour ${token}`);
  
  // Créer un tableau pour stocker tous les taux avec leur date au format YYYYMMDD
  const allRatesArray: Array<{ date: string; rate: DailyRate }> = [];
  allRates.forEach((rate, index) => {
    allRatesArray.push({ date: formatDateYYYYMMDD(rate.timestamp), rate });
  });
  
  // Afficher les taux pour vérification
  console.log("⚠️ LISTE COMPLÈTE DES TAUX DISPONIBLES:");
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

  // Afficher les 5 premières transactions pour débogage
  debtTransactions.slice(0, 5).forEach((tx, idx) => {
    console.log(`Transaction ${idx+1}: Type=${tx.transactionType}, Montant=${tx.amount}, Date=${new Date(tx.timestamp * 1000).toISOString()}`);
  });
  
  // Vérifier que la première transaction est bien un emprunt
  if (debtTransactions[0].transactionType !== 'borrow') {
    console.warn(`La première transaction n'est pas un emprunt mais un ${debtTransactions[0].transactionType}`);
  }
  
  // Créer un tableau pour stocker les détails jour par jour
  const dailyDebtDetails: Array<{
    date: string;
    timestamp: number;
    debt: number;
    dailyRate: number;
    apr: number; // Ajouté
    dailyInterest: number;
    totalInterest: number;
    transactionAmount: number | null;
    transactionType: string | null;
  }> = [];
  
  // Définir la plage de dates (du début des transactions à aujourd'hui)
  const startDate = getPreviousDayMidnight(debtTransactions[0].timestamp);
  const endDate = Math.floor(Date.now() / 1000); // Aujourd'hui à minuit
  
  // Initialiser les variables
  let currentDebt = 0;
  let totalInterest = 0;
  
  // Créer un tableau de jours pour itération
  const days = [];
  for (let currentDate = startDate; currentDate <= endDate; currentDate += 86400) {
    days.push(currentDate);
  }
  
  console.log(`⚠️ CALCUL pour ${days.length} jours, du ${new Date(startDate * 1000).toISOString()} au ${new Date(endDate * 1000).toISOString()}`);
  
  // Fonction pour utiliser le taux par défaut (à l'intérieur du scope pour accéder à dailyDebtDetails)
  const useDefaultRate = (
    dateKey: string, 
    currentDate: number, 
    currDebt: number, 
    currTotalInterest: number, 
    txAmount: number | null, 
    txType: string | null
  ): void => {
    console.warn(`⚠️ Aucun taux alternatif proche trouvé, utilisation d'un taux fixe de secours: 7%`);
    const backupRateValue = 0.07; // 7% annuel 
    const aprPercentage = backupRateValue * 100; // 7.0%
    const dailyRateValue = backupRateValue / 365;
    const dailyInterest = currDebt * dailyRateValue;
    
    // Ajouter l'intérêt à la dette et au total
    currDebt += dailyInterest;
    currTotalInterest += dailyInterest;
    
    // Enregistrer les détails du jour avec le taux de secours
    dailyDebtDetails.push({
      date: dateKey,
      timestamp: currentDate,
      debt: currDebt,
      dailyRate: dailyRateValue,
      apr: aprPercentage, // Taux annuel en pourcentage fixe
      dailyInterest,
      totalInterest: currTotalInterest + dailyInterest,
      transactionAmount: txAmount,
      transactionType: txType
    });
  };
  
  // Pour chaque jour de la plage, calculer les intérêts
  for (const currentDate of days) {
    const dateKey = formatDateYYYYMMDD(currentDate);
    
    // Si le dateKey est invalide, passer au jour suivant
    if (dateKey === 'invalide') {
      console.warn(`⚠️ Date invalide ignorée: ${currentDate}`);
      continue;
    }
    
    // Extraire correctement les composants de la date pour le log
    let formattedDate = '';
    try {
      const date = new Date(currentDate * 1000);
      if (isNaN(date.getTime())) {
        console.warn(`⚠️ Date invalide pour le timestamp: ${currentDate}`);
        formattedDate = `Timestamp: ${currentDate}`;
      } else {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        formattedDate = `${year}-${month}-${day}`;
      }
    } catch (error) {
      console.error(`⚠️ Erreur de formatage de la date:`, error);
      formattedDate = `Timestamp: ${currentDate}`;
    }
    
    // Transactions effectuées ce jour-là (plus efficace avec la nouvelle fonction)
    const dayTransactions = debtTransactions.filter(tx => isSameDay(tx.timestamp, currentDate));
    
    let transactionAmount = null;
    let transactionType = null;
    
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
    
    // Récupérer le taux du jour - avec log détaillé pour vérifier les correspondances
    console.log(`⚠️ Recherche de taux pour la date ${dateKey} (${formattedDate})`);
    const dailyRate = allRates.find(rate => formatDateYYYYMMDD(rate.timestamp) === dateKey);
    
    if (dailyRate) {
      console.log(`⚠️ TROUVÉ: Taux pour ${dateKey} = ${(dailyRate.variableBorrowRate_avg * 100).toFixed(6)}%`);
    } else {
      console.log(`⚠️ NON TROUVÉ: Aucun taux pour ${dateKey}`);
      
      // Afficher tous les dateKey pour vérification
      console.log("⚠️ Toutes les clés disponibles dans allRates:");
      allRates.forEach((_, index) => console.log(formatDateYYYYMMDD(allRates[index].timestamp)));
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
        apr: aprPercentage, // Taux annuel en pourcentage
        dailyInterest,
        totalInterest,
        transactionAmount,
        transactionType
      });
    } else if (currentDebt > 0) {
      // Si le taux n'est pas disponible pour ce jour spécifique, chercher dans les données brutes
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
        const alternativeRate = allRates.find(rate => formatDateYYYYMMDD(rate.timestamp) === nearestDate);
        if (alternativeRate) {
          const rateValue = alternativeRate.variableBorrowRate_avg;
          const aprPercentage = rateValue * 100; // APR en pourcentage
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
            apr: aprPercentage, // Taux annuel en pourcentage
            dailyInterest,
            totalInterest,
            transactionAmount,
            transactionType
          });
        } else {
          console.error(`⚠️ Erreur inattendue: taux alternatif non trouvé pour ${nearestDate}`);
          // Fallback sur le taux par défaut
          useDefaultRate(dateKey, currentDate, currentDebt, totalInterest, transactionAmount, transactionType);
        }
      } else {
        // Si aucun taux proche n'est trouvé, utiliser le taux par défaut
        useDefaultRate(dateKey, currentDate, currentDebt, totalInterest, transactionAmount, transactionType);
      }
    } else if (transactionAmount !== null) {
      // Aucune dette mais il y a eu une transaction
      dailyDebtDetails.push({
        date: dateKey,
        timestamp: currentDate,
        debt: currentDebt,
        dailyRate: 0,
        apr: 0, // Pas de taux si pas de dette
        dailyInterest: 0,
        totalInterest,
        transactionAmount,
        transactionType
      });
    }
  }
  
  // Vérifier et corriger les entrées sans APR (pour les données existantes)
  for (let i = 0; i < dailyDebtDetails.length; i++) {
    if (dailyDebtDetails[i].apr === undefined) {
      console.warn(`⚠️ Entrée sans APR détectée pour ${dailyDebtDetails[i].date}, ajout d'une valeur par défaut`);
      dailyDebtDetails[i].apr = 0;
    }
  }
  
  console.log(`⚠️ CALCUL TERMINÉ: ${dailyDebtDetails.length} jours calculés, intérêt total: ${totalInterest.toFixed(6)} ${token}`);
  
  return { dailyDebtDetails, totalInterest };
}; 