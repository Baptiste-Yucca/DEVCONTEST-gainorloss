import { fetchBorrows, fetchSupplies, fetchWithdraws, fetchRepays, Transaction } from '../api';
import { TransactionWithType } from '../../types/transaction';
import { RESERVE_TO_TICKER, TokenTicker } from '../constants';

/**
 * Récupère toutes les transactions pour une adresse donnée
 * @param address Adresse au format EVM
 * @returns Un tableau de transactions triées par date (plus récentes en premier)
 */
export const fetchAllTransactions = async (address: string): Promise<TransactionWithType[]> => {
  try {
    // Pour l'instant, utiliser des données de test car l'API GraphQL est dépréciée
    console.log('⚠️ Utilisation de données de test - API GraphQL dépréciée');
    
    // Données de test pour une adresse exemple
    const testTransactions: TransactionWithType[] = [
      {
        id: 'test-borrow-1',
        amount: '1000000', // 1 USDC
        timestamp: Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60), // 30 jours en arrière
        transactionType: 'borrow',
        ticker: 'USDC',
        formattedDate: '20241201000000'
      },
      {
        id: 'test-repay-1',
        amount: '500000', // 0.5 USDC
        timestamp: Math.floor(Date.now() / 1000) - (15 * 24 * 60 * 60), // 15 jours en arrière
        transactionType: 'repay',
        ticker: 'USDC',
        formattedDate: '20241215000000'
      }
    ];
    
    return testTransactions;

    
    // D'abord, créons une fonction utilitaire dans le même fichier
    const timestampToFormattedDate = (timestamp: number): string => {
      const date = new Date(timestamp * 1000);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');
      
      return `${year}${month}${day}${hours}${minutes}${seconds}`;
    };
    
    // Tri par date (plus récent en premier)
    const sortedTransactions = testTransactions.sort((a, b) => b.timestamp - a.timestamp);
    
    return sortedTransactions;
  } catch (error) {
    console.error("Erreur lors de la récupération des transactions:", error);
    throw error;
  }
};

/**
 * Filtre les transactions USDC et les trie par date (plus anciennes en premier)
 * @param transactions Tableau de transactions
 * @returns Transactions USDC triées
 */
export const getUsdcTransactions = (transactions: TransactionWithType[]): TransactionWithType[] => {
  return transactions
    .filter(tx => tx.ticker === TokenTicker.USDC)
    .sort((a, b) => a.timestamp - b.timestamp);
};