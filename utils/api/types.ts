export type Transaction = {
  id: string;
  txHash: string;
  user: {
    id: string;
  };
  reserve: {
    id: string;
  };
  amount: string;
  timestamp: number;
  borrowRate?: string;
  borrowRateMode?: string;
};

export type TransactionResponse = {
  borrows?: Transaction[];
  supplies?: Transaction[];
  withdraws?: Transaction[];
  repays?: Transaction[];
};

export type TokenBalances = {
  armmUSDC: string;
  armmWXDAI: string;
  debtUSDC: string;
  debtWXDAI: string;
}; 