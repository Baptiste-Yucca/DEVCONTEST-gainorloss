export interface WalletData {
  address: string;
  usdc: {
    debt: number;
    supply: number;
    totalInterest: number;
    dailyDetails: DailyDetail[];
  };
  wxdai: {
    debt: number;
    supply: number;
    totalInterest: number;
    dailyDetails: DailyDetail[];
  };
  summary: {
    totalDebt: number;
    totalSupply: number;
    netPosition: number;
    totalInterest: number;
  };
}

export interface DailyDetail {
  date: string;
  timestamp: number;
  debt?: number;
  supply?: number;
  dailyRate: number;
  apr: number;
  dailyInterest: number;
  totalInterest: number;
  transactionAmount?: number | null;
  transactionType?: string | null;
}

export interface AddressFormProps {
  wallets: string[];
  onAddressChange: (index: number, address: string) => void;
  onAddWallet: () => void;
  onRemoveWallet: (index: number) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export interface WalletDashboardProps {
  walletData: WalletData[];
  wallets: string[];
} 