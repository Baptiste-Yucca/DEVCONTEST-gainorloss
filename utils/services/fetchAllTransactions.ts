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
    // Récupérer toutes les transactions
    const [borrowsData, suppliesData, withdrawsData, repaysData] = await Promise.all([
      fetchBorrows(address),
      fetchSupplies(address),
      fetchWithdraws(address),
      fetchRepays(address)
    ]);

    
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
    
    // Ensuite, mettez à jour chaque mapping dans la création des transactions
    const transactions: TransactionWithType[] = [
      ...suppliesData.map((tx: Transaction) => ({ 
        ...tx, 
        transactionType: 'supply' as const, 
        ticker: RESERVE_TO_TICKER[tx.reserve.id] || 'err',
        formattedDate: timestampToFormattedDate(tx.timestamp)
      })),
      ...withdrawsData.map((tx: Transaction) => ({ 
        ...tx, 
        transactionType: 'withdraw' as const, 
        ticker: RESERVE_TO_TICKER[tx.reserve.id] || 'err',
        formattedDate: timestampToFormattedDate(tx.timestamp) 
      })),
      ...borrowsData.map((tx: Transaction) => ({ 
        ...tx, 
        transactionType: 'borrow' as const, 
        ticker: RESERVE_TO_TICKER[tx.reserve.id] || 'err',
        formattedDate: timestampToFormattedDate(tx.timestamp)
      })),
      ...repaysData.map((tx: Transaction) => ({ 
        ...tx, 
        transactionType: 'repay' as const, 
        ticker: RESERVE_TO_TICKER[tx.reserve.id] || 'err',
        formattedDate: timestampToFormattedDate(tx.timestamp)
      }))
    ];
    
    // Tri par date (plus récent en premier)
    const sortedTransactions = transactions.sort((a, b) => b.timestamp - a.timestamp);
    
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