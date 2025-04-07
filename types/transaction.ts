export interface Transaction {
  id: string;
  timestamp: number;
  amount: string;
  transactionType: 'supply' | 'withdraw' | 'borrow' | 'repay';
  reserve: {
    id: string;
  };
}

export interface TransactionWithType extends Transaction {
  transactionType: 'supply' | 'withdraw' | 'borrow' | 'repay';
} 