import axios from 'axios';

// Configuration de l'API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// Instance axios configurée
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types TypeScript
export interface Rate {
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

export interface Transaction {
  id: string;
  user: string;
  reserve: {
    id: string;
    symbol: string;
    decimals: number;
  };
  amount: string;
  timestamp: number;
  txHash: string;
  transactionType?: 'supply' | 'withdraw' | 'borrow' | 'repay';
}

export interface Balance {
  armmUSDC: string;
  armmWXDAI: string;
  debtUSDC: string;
  debtWXDAI: string;
}

export interface TokenDetail {
  symbol: string;
  name: string;
  supply: {
    token: string;
    balance: string;
    formatted: string;
  };
  debt: {
    token: string;
    balance: string;
    formatted: string;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

// Service des taux d'intérêt
export const ratesService = {
  /**
   * Récupère les taux d'intérêt pour un token et une période
   */
  async getRates(token: string, fromDate: string, toDate?: string): Promise<Rate[]> {
    try {
      const response = await api.post<ApiResponse<{
        token: string;
        fromDate: string;
        toDate: string;
        count: number;
        rates: Rate[];
      }>>('/api/rates', {
        token,
        fromDate,
        toDate,
      });

      return response.data.data.rates;
    } catch (error) {
      console.error('Erreur lors de la récupération des taux:', error);
      throw new Error('Impossible de récupérer les taux d\'intérêt');
    }
  },

  /**
   * Récupère les statistiques de la base de données
   */
  async getStats() {
    try {
      const response = await api.get<ApiResponse<{
        stats: any[];
        summary: {
          totalTokens: number;
          totalEntries: number;
        };
      }>>('/api/rates/stats');

      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      throw new Error('Impossible de récupérer les statistiques');
    }
  },

  /**
   * Récupère la liste des tokens supportés
   */
  async getTokens() {
    try {
      const response = await api.get<ApiResponse<{
        tokens: Array<{
          symbol: string;
          name: string;
          reserveId: string;
          decimals: number;
        }>;
      }>>('/api/rates/tokens');

      return response.data.data.tokens;
    } catch (error) {
      console.error('Erreur lors de la récupération des tokens:', error);
      throw new Error('Impossible de récupérer la liste des tokens');
    }
  },
};

// Service des transactions
export const transactionsService = {
  /**
   * Récupère toutes les transactions d'une adresse
   */
  async getTransactions(address: string, type?: string): Promise<Transaction[]> {
    try {
      const params = type ? { type } : {};
      const response = await api.get<ApiResponse<{
        address: string;
        stats: any;
        transactions: Transaction[];
        summary: any;
      }>>(`/api/transactions/${address}`, { params });

      return response.data.data.transactions;
    } catch (error) {
      console.error('Erreur lors de la récupération des transactions:', error);
      throw new Error('Impossible de récupérer les transactions');
    }
  },

  /**
   * Récupère le résumé des transactions d'une adresse
   */
  async getTransactionSummary(address: string) {
    try {
      const response = await api.get<ApiResponse<{
        address: string;
        summary: {
          totalTransactions: number;
          byType: {
            supply: number;
            withdraw: number;
            borrow: number;
            repay: number;
          };
          byToken: any;
          dateRange: any;
        };
      }>>(`/api/transactions/${address}/summary`);

      return response.data.data.summary;
    } catch (error) {
      console.error('Erreur lors de la récupération du résumé:', error);
      throw new Error('Impossible de récupérer le résumé des transactions');
    }
  },
};

// Service des soldes
export const balancesService = {
  /**
   * Récupère les soldes d'une adresse
   */
  async getBalances(address: string): Promise<Balance> {
    try {
      const response = await api.get<ApiResponse<{
        address: string;
        balances: Balance;
        summary: any;
      }>>(`/api/balances/${address}`);

      return response.data.data.balances;
    } catch (error) {
      console.error('Erreur lors de la récupération des soldes:', error);
      throw new Error('Impossible de récupérer les soldes');
    }
  },

  /**
   * Récupère les détails des tokens pour une adresse
   */
  async getTokenDetails(address: string): Promise<TokenDetail[]> {
    try {
      const response = await api.get<ApiResponse<{
        address: string;
        tokens: TokenDetail[];
        summary: {
          totalSupplyUSD: number;
          totalDebtUSD: number;
          netPositionUSD: number;
        };
      }>>(`/api/balances/${address}/tokens`);

      return response.data.data.tokens;
    } catch (error) {
      console.error('Erreur lors de la récupération des détails des tokens:', error);
      throw new Error('Impossible de récupérer les détails des tokens');
    }
  },
};

// Service de santé
export const healthService = {
  /**
   * Vérifie l'état de santé de l'API
   */
  async checkHealth() {
    try {
      const response = await api.get<ApiResponse<any>>('/api/health');
      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la vérification de santé:', error);
      throw new Error('Impossible de vérifier l\'état de santé de l\'API');
    }
  },

  /**
   * Vérification détaillée de l'état de santé
   */
  async checkDetailedHealth() {
    try {
      const response = await api.get<ApiResponse<any>>('/api/health/detailed');
      return response.data.data;
    } catch (error) {
      console.error('Erreur lors de la vérification détaillée:', error);
      throw new Error('Impossible de vérifier l\'état de santé détaillé');
    }
  },
};

export default api; 