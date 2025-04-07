import { fetchBorrows, fetchSupplies, fetchWithdraws, fetchRepays } from '../api';
import { fetchTokenBalances } from '../api';
import { calculateDailyDebtWithInterest } from '../interest-calculations';
import { Transaction } from '../api/types';
import { TransactionWithType } from '../../types/transaction';
import { DailyCostDetail } from '../../types/interest';

interface AddressDataResult {
  transactions: TransactionWithType[];
  tokenBalances: any; // À typer correctement selon vos besoins
  dailyDebtDetails: DailyCostDetail[];
  totalInterest: number;
  rawRates: any[]; // À typer correctement selon vos besoins
}

export const fetchAddressData = async (address: string) => {
    console.log('Adresse reçue:', address);
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
          ...suppliesData.map(tx => ({ ...tx, transactionType: 'supply' as const })),
          ...withdrawsData.map(tx => ({ ...tx, transactionType: 'withdraw' as const })),
          ...borrowsData.map(tx => ({ ...tx, transactionType: 'borrow' as const })),
          ...repaysData.map(tx => ({ ...tx, transactionType: 'repay' as const }))
        ];
        
        // Tri par date (plus récent en premier)
        const sortedTransactions = transactions.sort((a, b) => b.timestamp - a.timestamp);
        
        const tokenBalances = await fetchTokenBalances(address);
        console.log("Soldes récupérés:", tokenBalances);
 
        
        // Pour l'instant, ne calculer que les intérêts USDC comme demandé
        const usdcTransactions = transactions.filter(tx => 
          getTokenSymbol(tx.reserve.id).includes('USDC')
        );
        console.log("il y a ",usdcTransactions.length, " transactions en USDC")

        let fromTimestamp = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60); // Par défaut, 30 jours en arrière
      if (sortedTransactions.length > 0) {
        const oldestTransaction = [...sortedTransactions].sort((a, b) => a.timestamp - b.timestamp)[0];
        fromTimestamp = oldestTransaction.timestamp;
        console.log("Transaction la plus ancienne:", new Date(fromTimestamp * 1000).toISOString());
      }
    } catch (err) {
        console.error('Error fetching data:', err);
    
    } 
        
};

// Fonctions utilitaires
const convertApiTransactions = (transactions: Transaction[], type: 'supply' | 'withdraw' | 'borrow' | 'repay'): TransactionWithType[] => {
  return transactions.map(tx => ({
    ...tx,
    transactionType: type
  }));
};

const calculateFromTimestamp = (transactions: TransactionWithType[]): number => {
  if (transactions.length === 0) {
    return Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60); // 30 jours par défaut
  }
  return [...transactions].sort((a, b) => a.timestamp - b.timestamp)[0].timestamp;
};

const fetchRawRates = async (fromTimestamp: number): Promise<any[]> => {
  const reserveId = '0xddafbb505ad214d7b80b1f830fccc89b60fb7a830xdaa06cf7adceb69fcfde68d896818b9938984a70'; // USDC
  const url = `https://rmm-api.realtoken.network/data/rates-history?reserveId=${reserveId}&from=${fromTimestamp}&resolutionInHours=24`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Erreur lors de la récupération des taux');
  }
  return response.json();
};

const getTokenSymbol = (reserveId: string): string => {
  if (reserveId.includes('USDC')) return 'USDC';
  if (reserveId.includes('WXDAI')) return 'WXDAI';
  return '';
}; 