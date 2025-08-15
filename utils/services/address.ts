import { fetchBorrows, fetchSupplies, fetchWithdraws, fetchRepays, Transaction, fetchTokenBalances } from '../api';
import { TransactionWithType } from '../../types/transaction';
import { DailyRate } from '../../types/interest';
import { fetchRmmRates } from '../api/rmm-api/rates';
import { TOKENS, ADDRESS_TO_TOKEN, RESERVE_TO_TICKER, TokenTicker} from '../constants';
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

        // Utiliser l'API RMM directement pour l'instant
        const { TOKENS } = await import('../constants');
        const reserveId = TOKENS.USDC.reserveId;
        const ratesResponse = await fetch(`https://rmm-api.realtoken.network/data/rates-history?reserveId=${reserveId}&from=${fromTimestamp}&resolutionInHours=24`);
        
        if (!ratesResponse.ok) {
            throw new Error(`Erreur lors de la récupération des taux: ${ratesResponse.statusText}`);
        }
        
        const ratesData = await ratesResponse.json();
        
        // Transformer les données de l'API RMM en format DailyRate
        const transformedRates = ratesData.map((rate: any) => ({
            timestamp: Math.floor(new Date(rate.x.year, rate.x.month, rate.x.date).getTime() / 1000),
            formattedDate: parseInt(`${rate.x.year}${String(rate.x.month + 1).padStart(2, '0')}${String(rate.x.date).padStart(2, '0')}000000`),
            variableBorrowRate_avg: rate.variableBorrowRate_avg,
            utilizationRate_avg: rate.utilizationRate_avg,
            year: rate.x.year,
            month: rate.x.month,
            day: rate.x.date
        }));
        
        // Appeler la fonction pour générer les données
        const processedDailyData = generateDailyData(transformedRates, usdcTransactions);
        
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
