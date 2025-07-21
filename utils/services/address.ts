import { fetchBorrows, fetchSupplies, fetchWithdraws, fetchRepays, Transaction, fetchTokenBalances } from '../api';
import { TransactionWithType } from '../../types/transaction';
import { DailyRate } from '../../types/interest';
import { fetchRmmRates } from '../api/rmm-api/rates';
import { TOKENS, ADDRESS_SC_TO_TOKEN, RESERVE_TO_TICKER, TokenTicker} from '../constants';
import { DailyData, DailyTransaction } from '../../types/dailyData';
import { fetchAllTransactions , getUsdcTransactions} from './fetchAllTransactions';
import { TokenBalances } from '../api/types';

export interface AddressData {
  tokenBalances: TokenBalances;
  transactions: TransactionWithType[];
  dailyData: DailyData[];
}

export const fetchAddressData = async (address: string): Promise<AddressData> => {
   
    try {
        // Récupérer les soldes des tokens
        const tokenBalances = await fetchTokenBalances(address);

        // Récupérer toutes les transactions
        const sortedTransactions = await fetchAllTransactions(address);
        
        // Pour l'instant, ne calculer que les intérêts USDC comme demandé
        const usdcTransactions = getUsdcTransactions(sortedTransactions);

        let fromTimestamp = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60); // Par défaut, 30 jours en arrière
        if (sortedTransactions.length > 0) {
            // on travaille surtoutes les transactions
            // On verra plus tard pour traiter les wxdai
            const oldestTransaction = [...sortedTransactions].sort((a, b) => a.timestamp - b.timestamp)[0];
            fromTimestamp = oldestTransaction.timestamp;
            
            // Calculer le nombre de jours entre la date la plus ancienne et aujourd'hui
            const today = Math.floor(Date.now() / 1000);
            const daysDiff = Math.floor((today - fromTimestamp) / (24 * 60 * 60));
        }

        // Récupérer les taux bruts pour les afficher dans un tableau
        const reserveId = '0xddafbb505ad214d7b80b1f830fccc89b60fb7a830xdaa06cf7adceb69fcfde68d896818b9938984a70'; // USDC
        const ratesResponse = await fetchRmmRates(reserveId, fromTimestamp);
        
        // Appeler la fonction pour générer les données
        const processedDailyData = generateDailyData(ratesResponse, usdcTransactions);
        
        // Retourner toutes les données dans un objet structuré
        return {
            tokenBalances,
            transactions: sortedTransactions,
            dailyData: processedDailyData
        };
    } catch (err) {
        console.error('Error fetching data:', err);
        throw err; // Propagez l'erreur plutôt que de retourner undefined
    }
};

// Fonction pour générer le tableau DailyData à partir des taux et des transactions
export const generateDailyData = (
  ratesData: DailyRate[], 
  transactions: TransactionWithType[]
): DailyData[] => {
  if (!ratesData.length || !transactions.length) {
    console.log("Aucune donnée de taux ou de transactions disponible");
    return [];
  }

  // Filtrer uniquement les transactions USDC de type borrow et repay
  const filteredTransactions = transactions.filter(tx => 
    tx.ticker === TokenTicker.USDC && (tx.transactionType === 'borrow' || tx.transactionType === 'repay')
  ).sort((a, b) => parseInt(a.formattedDate) - parseInt(b.formattedDate)); // Tri par formattedDate

  if (filteredTransactions.length === 0 || !filteredTransactions.some(tx => tx.transactionType === 'borrow')) {
    console.log("Aucun emprunt trouvé, impossible de calculer les intérêts");
    return [];
  }

  // Créer un map des taux par date (format YYYYMMDD)
  const ratesByDate = new Map<string, number>();
  ratesData.forEach(rate => {
    // Extraire seulement la partie YYYYMMDD du formattedDate
    const dateKey = rate.formattedDate.toString().substring(0, 8);
    ratesByDate.set(dateKey, rate.variableBorrowRate_avg);
  });

  // Déterminer la date de début et de fin
  const firstBorrow = filteredTransactions.find(tx => tx.transactionType === 'borrow');
  if (!firstBorrow) return [];
  
  // Utiliser formattedDate pour définir la période
  const startDateStr = firstBorrow.formattedDate.substring(0, 8); // YYYYMMDD
  const endDateStr = ratesData[ratesData.length - 1].formattedDate.toString().substring(0, 8);

  // Regrouper les transactions par jour
  const transactionsByDay = new Map<string, TransactionWithType[]>();
  filteredTransactions.forEach(tx => {
    const dateKey = tx.formattedDate.substring(0, 8); // YYYYMMDD
    
    if (!transactionsByDay.has(dateKey)) {
      transactionsByDay.set(dateKey, []);
    }
    transactionsByDay.get(dateKey)!.push(tx);
  });
  
  // Initialiser le tableau de résultats
  const result: DailyData[] = [];
  let currentAmount = 0n;
  let cumulInterestday = 0n;
  let currentDateStr = startDateStr;
  
  // Fonction pour incrémenter une date au format YYYYMMDD
  const incrementDate = (dateStr: string): string => {
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1; // Les mois en JS sont 0-indexés
    const day = parseInt(dateStr.substring(6, 8));
    
    const date = new Date(year, month, day);
    date.setDate(date.getDate() + 1);
    
    return `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
  };
  
  // Fonction pour comparer deux dates au format YYYYMMDD
  const compareDates = (date1: string, date2: string): number => {
    return parseInt(date1) - parseInt(date2);
  };
  
  // Parcourir tous les jours de la période
  while (compareDates(currentDateStr, endDateStr) <= 0) {
    const dayTransactions = transactionsByDay.get(currentDateStr) || [];
    
    // Trier les transactions du jour par formattedDate
    dayTransactions.sort((a, b) => parseInt(a.formattedDate) - parseInt(b.formattedDate));
    
    // Récupérer le taux du jour ou 0 par défaut
    const dailyRate = ratesByDate.get(currentDateStr) || 0;
    const dailyInterestRate = dailyRate / 365; // Taux d'intérêt journalier
    
    // Convertir les transactions en DailyTransaction
    const dailyTxs: DailyTransaction[] = dayTransactions.map(tx => ({
      type: tx.transactionType,
      amount: tx.amount,
      timestamp: parseInt(tx.formattedDate)
    }));
    
    // Cas particulier: Premier jour avec emprunt
    if (currentDateStr === startDateStr && firstBorrow.transactionType === 'borrow') {
      // Pour le premier jour, on initialise le montant de la dette avec le premier emprunt
      currentAmount = BigInt(firstBorrow.amount);
      
      // Pas d'intérêts pour le jour initial d'emprunt
      result.push({
        date: currentDateStr,
        amount: currentAmount,
        interest: 0n,
        rate: dailyRate.toString(),
        sumInterest: 0n,
        transactions: dailyTxs
      });
    } 
    // Jours ordinaires
    else if (dayTransactions.length === 0) {
      // Pas de transactions ce jour-là, calcul simple des intérêts sur le montant actuel
      const dayInterest = currentAmount * BigInt(Math.floor(dailyInterestRate * 1e18)) / BigInt(1e18);
      cumulInterestday += dayInterest;
      currentAmount += dayInterest;
      
      result.push({
        date: currentDateStr,
        amount: currentAmount,
        interest: dayInterest,
        rate: dailyRate.toString(),
        sumInterest: cumulInterestday,
        transactions: []
      });
    } 
    // Jours avec transactions
    else {
      // Il y a des transactions ce jour-là, calcul plus complexe
      const secondsInDay = 86400; // 24 * 60 * 60
      let lastTransactionTime = 0; // Début de la journée en secondes depuis minuit
      let runningAmount = currentAmount;
      let dayTotalInterest = 0n;
      
      // Pour chaque transaction du jour
      for (const tx of dayTransactions) {
        // Extraire l'heure, minute, seconde de formattedDate (YYYYMMDDhhmmss)
        const hours = parseInt(tx.formattedDate.substring(8, 10));
        const minutes = parseInt(tx.formattedDate.substring(10, 12));
        const seconds = parseInt(tx.formattedDate.substring(12, 14));
        const currentTransactionTime = hours * 3600 + minutes * 60 + seconds;
        
        // Calculer les intérêts pour la période entre la dernière transaction et celle-ci
        const periodSeconds = currentTransactionTime - lastTransactionTime;
        const periodRatio = periodSeconds / secondsInDay;
        const periodInterest = runningAmount * BigInt(Math.floor(dailyInterestRate * periodRatio * 1e18)) / BigInt(1e18);
        
        dayTotalInterest += periodInterest;
        runningAmount += periodInterest;
        
        // Appliquer la transaction (borrow ou repay)
        if (tx.transactionType === 'borrow') {
          runningAmount += BigInt(tx.amount);
        } else if (tx.transactionType === 'repay') {
          runningAmount -= BigInt(tx.amount);
          // Éviter les montants négatifs
          if (runningAmount < 0n) runningAmount = 0n;
        }
        
        lastTransactionTime = currentTransactionTime;
      }
      
      // Important: Calculer les intérêts pour la période entre la dernière transaction et la fin de la journée
      const remainingSeconds = secondsInDay - lastTransactionTime;
      const remainingRatio = remainingSeconds / secondsInDay;
      const remainingInterest = runningAmount * BigInt(Math.floor(dailyInterestRate * remainingRatio * 1e18)) / BigInt(1e18);
      
      dayTotalInterest += remainingInterest;
      runningAmount += remainingInterest;
      cumulInterestday += dayTotalInterest;
      
      // Mettre à jour le montant courant pour le jour suivant
      currentAmount = runningAmount;
      
      result.push({
        date: currentDateStr,
        amount: currentAmount,
        interest: dayTotalInterest,
        rate: dailyRate.toString(),
        sumInterest: cumulInterestday,
        transactions: dailyTxs
      });
    }
    
    // Passer au jour suivant
    currentDateStr = incrementDate(currentDateStr);
  }

  return result;
};
