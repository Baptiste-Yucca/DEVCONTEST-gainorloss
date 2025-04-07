import { DailyRate } from '../../../types/interest';

interface RmmApiRate {
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
}

export const fetchRmmRates = async (reserveId: string, fromTimestamp: number): Promise<DailyRate[]> => {
  const url = `https://rmm-api.realtoken.network/data/rates-history?reserveId=${reserveId}&from=${fromTimestamp}&resolutionInHours=24`;
  console.log("⚠️ Requête API RMM:", url);
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Erreur lors de la récupération des taux: ${response.statusText}`);
  }

  const rates = await response.json() as RmmApiRate[];

  if (!Array.isArray(rates)) {
    throw new Error("Format de réponse API invalide: attendu un tableau");
  }

  // On transforme directement les données de l'API en DailyRate
  return rates.map((rate: RmmApiRate) => {
    if (!rate.x || !rate.variableBorrowRate_avg) {
      console.warn("⚠️ Donnée invalide ignorée:", rate);
      return null;
    }
    return {
      timestamp: Math.floor(new Date(rate.x.year, rate.x.month, rate.x.date).getTime() / 1000),
      variableBorrowRate_avg: rate.variableBorrowRate_avg,
      utilizationRate_avg: rate.utilizationRate_avg,
      year: rate.x.year,
      month: rate.x.month,
      day: rate.x.date
    };
  }).filter((rate: DailyRate | null): rate is DailyRate => rate !== null);
}; 