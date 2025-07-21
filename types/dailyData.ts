import { Transaction } from './transaction';

export type TransactionType = Pick<Transaction, 'transactionType'>['transactionType'];

export interface DailyTransaction {
  type: TransactionType;
  amount: string;
  timestamp: number; // Unix timestamp
}

export interface DailyData {
  date: string; // Format YYYYMMDD
  amount: bigint; // Montant en USDC
  interest: bigint; // Intérêt en USDC
  rate: string;
  sumInterest : bigint
  transactions?: DailyTransaction[]; // Transactions optionnelles
} 