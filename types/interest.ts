export interface DailyRate {
  variableBorrowRate_avg: number;
  utilizationRate_avg: number;
  year: number;
  month: number;
  day: number;
  timestamp: number;
  formattedDate: number; // format YYYYMMDDhhmmss
}

export interface DailyCostDetail {
  date: string; // Format YYYYMMDD
  timestamp: number;
  debtAmount: number; // Ajout du montant de la dette
  dailyRate: number; // Ajout du taux journalier
  apr: number; // Taux annuel en pourcentage
  periodInterest: number;
  cumulativeInterest: number;
}

export type DailyCost = number; 

export function logDailyRateInfo(rate: DailyRate): void {
  // Construire la date au format YYYYMMDD
  // month et day peuvent être sur 1 chiffre, donc on les complète avec un zéro si besoin
  const yearString = rate.year.toString().padStart(4, "0");
  const monthString = rate.month.toString().padStart(2, "0");
  const dayString = rate.day.toString().padStart(2, "0");
  const yyyyMMdd = `${yearString}${monthString}${dayString}`;

  console.log(
    `Taux (variableBorrowRate_avg): ${rate.variableBorrowRate_avg}`,
    `\nTimestamp : ${rate.timestamp}`,
    `\nformatted : ${rate.formattedDate}`,
    `\nDate (YYYYMMDD): ${yyyyMMdd}`
  );
}