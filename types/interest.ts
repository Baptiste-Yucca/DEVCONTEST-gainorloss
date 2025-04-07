export interface DailyRate {
  variableBorrowRate_avg: number;
  utilizationRate_avg: number;
  year: number;
  month: number;
  day: number;
  timestamp: number;
}

export interface DailyCostDetail {
  date: string; // Format YYYYMMDD
  timestamp: number;
  debtAmount: number; // Ajout du montant de la dette
  dailyRate: number; // Ajout du taux journalier
  apr: number; // Taux annuel en pourcentage
  dailyInterest: number;
  cumulativeInterest: number;
}

export type DailyCost = number; 