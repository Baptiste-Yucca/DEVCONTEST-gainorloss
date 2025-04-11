import { fetchBorrows, fetchSupplies, fetchWithdraws, fetchRepays, Transaction } from '../api';
import { TransactionWithType } from '../../types/transaction';
import { RESERVE_TO_TICKER, TokenTicker } from '../constants';

/**
 * Récupère toutes les transactions pour une adresse donnée
 * @param address Adresse au format EVM
 * @returns Un tableau de transactions triées par date (plus récentes en premier)
 */
export const fetchAllTransactions = async (address: string): Promise<TransactionWithType[]> => {
  console.log('Récupération des transactions pour:', address);
  try {
    // Récupérer toutes les transactions
    const [borrowsData, suppliesData, withdrawsData, repaysData] = await Promise.all([
      fetchBorrows(address),
      fetchSupplies(address),
      fetchWithdraws(address),
      fetchRepays(address)
    ]);
    
    // Log pour le débogage
    console.log("Transactions récupérées:", {
      supplies: suppliesData.length,
      withdraws: withdrawsData.length, 
      borrows: borrowsData.length,
      repays: repaysData.length
    });
    
    // Ajouter le type à chaque transaction et les combiner
    const transactions: TransactionWithType[] = [
      ...suppliesData.map((tx: Transaction) => ({ 
        ...tx, 
        transactionType: 'supply' as const, 
        ticker: RESERVE_TO_TICKER[tx.reserve.id] || 'err' 
      })),
      ...withdrawsData.map((tx: Transaction) => ({ 
        ...tx, 
        transactionType: 'withdraw' as const, 
        ticker: RESERVE_TO_TICKER[tx.reserve.id] || 'err' 
      })),
      ...borrowsData.map((tx: Transaction) => ({ 
        ...tx, 
        transactionType: 'borrow' as const, 
        ticker: RESERVE_TO_TICKER[tx.reserve.id] || 'err' 
      })),
      ...repaysData.map((tx: Transaction) => ({ 
        ...tx, 
        transactionType: 'repay' as const, 
        ticker: RESERVE_TO_TICKER[tx.reserve.id] || 'err' 
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