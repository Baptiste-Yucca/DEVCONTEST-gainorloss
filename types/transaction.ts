export interface Transaction {
  id: string;
  timestamp: number;
  formattedDate: string;
  amount: string;
  transactionType: 'supply' | 'withdraw' | 'borrow' | 'repay';
  ticker:  string;
}

export interface TransactionWithType extends Transaction {
  transactionType: 'supply' | 'withdraw' | 'borrow' | 'repay';
} 
