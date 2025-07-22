const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Import depuis les constantes centralisées
const { TOKENS } = require('../../utils/constants.js');

// Chemin vers la base de données
const DB_PATH = path.join(__dirname, '../../data/rates.db');

/**
 * Calcule l'intérêt quotidien sur un montant supply donné un taux journalier (ex: 0.00015).
 *
 * @param supply - montant du token en base units (BigInt)
 * @param dailyRate - taux quotidien (float, ex: 0.0001515)
 * @param decimals - nombre de décimales du token (ex: 18 pour WXDAI, 6 pour USDC)
 * @returns BigInt - montant de l'intérêt quotidien (en base units)
 */
function computeDailyInterest(supply, dailyRate, decimals) {
  // On convertit dailyRate en ray (fixé à 27 décimales pour la précision des calculs)
  const RAY = BigInt(1e27);
  const scaledRate = BigInt(Math.floor(dailyRate * 1e27)); // dailyRate en ray

  // L'intérêt est : supply * rate / 1e27
  const interest = (supply * scaledRate) / RAY;

  return interest;
}

/**
 * Initialise la connexion à la base de données
 */
function initDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Erreur lors de l\'ouverture de la base de données:', err);
        reject(err);
        return;
      }
      resolve(db);
    });
  });
}

/**
 * Récupère les taux depuis la base de données pour un token et une période
 */
async function fetchRatesFromDB(token, fromTimestamp) {
  try {
    const db = await initDatabase();
    
    // Convertir le timestamp en date YYYYMMDD
    const fromDate = new Date(fromTimestamp * 1000);
    const year = fromDate.getFullYear();
    const month = String(fromDate.getMonth() + 1).padStart(2, '0');
    const day = String(fromDate.getDate()).padStart(2, '0');
    const fromDateStr = `${year}${month}${day}`;
    
    console.log(`📊 Récupération des taux depuis la DB pour ${token} à partir de ${fromDateStr}`);
    
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM interest_rates 
        WHERE token = ? AND date >= ?
        ORDER BY date ASC
      `;
      
      db.all(sql, [token, fromDateStr], (err, rows) => {
        db.close();
        if (err) {
          console.error('Erreur lors de la récupération des taux:', err);
          reject(err);
          return;
        }
        
        console.log(`📊 ${rows.length} taux récupérés depuis la DB pour ${token}`);
        resolve(rows || []);
      });
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération des taux depuis la DB:', error);
    throw error;
  }
}

/**
 * Formate une date en YYYYMMDD
 */
function formatDateYYYYMMDD(timestamp) {
  const date = new Date(timestamp * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Obtient le timestamp de minuit pour une date donnée
 */
function getPreviousDayMidnight(timestamp) {
  const date = new Date(timestamp * 1000);
  date.setHours(0, 0, 0, 0);
  return Math.floor(date.getTime() / 1000);
}

/**
 * Calcule les intérêts pour les emprunts (borrows) avec précision intra-journalière
 */
async function calculateBorrowInterest(transactions, token) {
  console.log(`💰 Calcul des intérêts d'emprunt pour ${token} (précision intra-journalière)`);
  
  // Filtrer seulement les transactions d'emprunt et de remboursement
  const debtTransactions = transactions.filter(tx => 
    tx.transactionType === 'borrow' || tx.transactionType === 'repay'
  ).sort((a, b) => a.timestamp - b.timestamp);
  

  
  if (debtTransactions.length === 0) {
    console.log(`Aucune transaction d'emprunt/remboursement pour ${token}`);
    return {
      totalInterest: 0,
      dailyDetails: [],
      summary: {
        totalBorrows: 0,
        totalRepays: 0,
        currentDebt: 0,
        totalInterest: 0
      }
    };
  }
  
  // Déterminer la période de calcul
  const firstTxTimestamp = debtTransactions[0].timestamp;
  const startTimestamp = getPreviousDayMidnight(firstTxTimestamp);
  const endTimestamp = Math.floor(Date.now() / 1000);
  
  console.log(`📅 Période de calcul: ${new Date(startTimestamp * 1000).toISOString()} → ${new Date(endTimestamp * 1000).toISOString()}`);
  
  // Récupérer tous les taux d'intérêt depuis la base de données
  const allRates = await fetchRatesFromDB(token, startTimestamp);
  
  // Créer un Map pour un accès rapide aux taux par date
  const ratesByDate = new Map();
  allRates.forEach(rate => {
    ratesByDate.set(rate.date, rate);
  });
  
  // Variables pour le calcul avec BigInt pour la précision
  let currentDebt = 0n;
  let totalInterest = 0n;
  let totalBorrows = 0n;
  let totalRepays = 0n;
  const dailyDetails = [];
  
  // Regrouper les transactions par jour
  const transactionsByDay = new Map();
  debtTransactions.forEach(tx => {
    const dateKey = formatDateYYYYMMDD(tx.timestamp);
    if (!transactionsByDay.has(dateKey)) {
      transactionsByDay.set(dateKey, []);
    }
    transactionsByDay.get(dateKey).push(tx);
  });
  
  // Calculer jour par jour avec précision intra-journalière
  for (let currentDate = startTimestamp; currentDate <= endTimestamp; currentDate += 86400) {
    const dateKey = formatDateYYYYMMDD(currentDate);
    const formattedDate = new Date(currentDate * 1000).toISOString().split('T')[0];
    
    // Récupérer les transactions du jour
    const dayTransactions = transactionsByDay.get(dateKey) || [];
    
    // Trier les transactions du jour par timestamp
    dayTransactions.sort((a, b) => a.timestamp - b.timestamp);
    
    // Récupérer le taux du jour depuis la DB
    const dailyRate = ratesByDate.get(dateKey);
    const dailyInterestRate = dailyRate ? dailyRate.variable_borrow_rate_avg / 365 : 0;
    
    let transactionAmount = null;
    let transactionType = null;
    let dayTotalInterest = 0n;
    
    // Cas particulier: Premier jour avec emprunt
    if (currentDate === startTimestamp && dayTransactions.length > 0 && dayTransactions[0].transactionType === 'borrow') {
      const firstBorrow = dayTransactions[0];
      
      let amount = 0n;
      amount = BigInt(firstBorrow.amount);
      
      currentDebt = amount;
      totalBorrows += amount;
      transactionAmount = amount.toString();
      transactionType = 'borrow';
      
      // Pas d'intérêts pour le jour initial d'emprunt
      dailyDetails.push({
        date: dateKey,
        timestamp: currentDate,
        debt: currentDebt.toString(),
        dailyRate: dailyInterestRate,
        apr: dailyRate ? dailyRate.variable_borrow_rate_avg * 100 : 0,
        dailyInterest: "0",
        totalInterest: totalInterest.toString(),
        transactionAmount,
        transactionType
      });
      
      // Traiter les autres transactions du jour si il y en a
      for (let i = 1; i < dayTransactions.length; i++) {
        const tx = dayTransactions[i];
        const txAmount = token === 'USDC' ? 
          BigInt(tx.amount) : 
          BigInt(tx.amount);
        
        if (tx.transactionType === 'borrow') {
          currentDebt += txAmount;
          totalBorrows += txAmount;
        } else if (tx.transactionType === 'repay') {
          currentDebt -= txAmount;
          totalRepays += txAmount;
          if (currentDebt < 0n) currentDebt = 0n;
        }
      }
    }
    // Jours ordinaires
    else if (dayTransactions.length === 0) {
      // Pas de transactions ce jour-là, calcul simple des intérêts sur le montant actuel
      if (currentDebt > 0n && dailyRate) {
        const dayInterest = computeDailyInterest(currentDebt, dailyInterestRate, token === 'USDC' ? 6 : 18);
        dayTotalInterest = dayInterest;
        totalInterest += dayInterest;
        currentDebt += dayInterest;
      }
      
      dailyDetails.push({
        date: dateKey,
        timestamp: currentDate,
        debt: currentDebt.toString(),
        dailyRate: dailyInterestRate,
        apr: dailyRate ? dailyRate.variable_borrow_rate_avg * 100 : 0,
        dailyInterest: dayTotalInterest.toString(),
        totalInterest: totalInterest.toString(),
        transactionAmount,
        transactionType
      });
    }
    // Jours avec transactions
    else {
      // Il y a des transactions ce jour-là, calcul intra-journalier précis
      const secondsInDay = 86400; // 24 * 60 * 60
      let lastTransactionTime = 0; // Début de la journée en secondes depuis minuit
      let runningAmount = currentDebt;
      
      // Pour chaque transaction du jour
      for (const tx of dayTransactions) {
        // Extraire l'heure, minute, seconde du timestamp
        const txDate = new Date(tx.timestamp * 1000);
        const hours = txDate.getHours();
        const minutes = txDate.getMinutes();
        const seconds = txDate.getSeconds();
        const currentTransactionTime = hours * 3600 + minutes * 60 + seconds;
        
        // Calculer les intérêts pour la période entre la dernière transaction et celle-ci
        if (runningAmount > 0n && dailyRate) {
          const periodSeconds = currentTransactionTime - lastTransactionTime;
          const periodRatio = periodSeconds / secondsInDay;
          const periodRate = dailyInterestRate * periodRatio;
          const periodInterest = computeDailyInterest(runningAmount, periodRate, token === 'USDC' ? 6 : 18);
          
          dayTotalInterest += periodInterest;
          runningAmount += periodInterest;
        }
        
        // Appliquer la transaction (borrow ou repay)
        let txAmount = 0n;
        if (token === 'USDC') {
          txAmount = BigInt(tx.amount);
        } else {
          txAmount = BigInt(tx.amount);
        }
        
        if (tx.transactionType === 'borrow') {
          runningAmount += txAmount;
          totalBorrows += txAmount;
          transactionAmount = txAmount.toString();
          transactionType = 'borrow';
        } else if (tx.transactionType === 'repay') {
          runningAmount -= txAmount;
          totalRepays += txAmount;
          transactionAmount = txAmount.toString();
          transactionType = 'repay';
          if (runningAmount < 0n) runningAmount = 0n;
        }
        
        lastTransactionTime = currentTransactionTime;
      }
      
      // Important: Calculer les intérêts pour la période entre la dernière transaction et la fin de la journée
      if (runningAmount > 0n && dailyRate) {
        const remainingSeconds = secondsInDay - lastTransactionTime;
        const remainingRatio = remainingSeconds / secondsInDay;
        const remainingRate = dailyInterestRate * remainingRatio;
        const remainingInterest = computeDailyInterest(runningAmount, remainingRate, token === 'USDC' ? 6 : 18);
        
        dayTotalInterest += remainingInterest;
        runningAmount += remainingInterest;
      }
      
      totalInterest += dayTotalInterest;
      currentDebt = runningAmount;
      
      dailyDetails.push({
        date: dateKey,
        timestamp: currentDate,
        debt: currentDebt.toString(),
        dailyRate: dailyInterestRate,
        apr: dailyRate ? dailyRate.variable_borrow_rate_avg * 100 : 0,
        dailyInterest: dayTotalInterest.toString(),
        totalInterest: totalInterest.toString(),
        transactionAmount,
        transactionType
      });
    }
  }
  
  console.log(`💰 Calcul terminé: ${dailyDetails.length} jours, total des intérêts: ${Number(totalInterest)} ${token}`);
  
  return {
    totalInterest: totalInterest.toString(),
    dailyDetails,
    summary: {
      totalBorrows: totalBorrows.toString(),
      totalRepays: totalRepays.toString(),
      currentDebt: currentDebt.toString(),
      totalInterest: totalInterest.toString()
    }
  };
}

/**
 * Calcule les intérêts pour les dépôts (supplies) avec précision intra-journalière
 */
async function calculateSupplyInterest(transactions, token) {
  console.log(`💰 Calcul des intérêts de dépôt pour ${token} (précision intra-journalière)`);
  
  // Filtrer seulement les transactions de dépôt et de retrait
  const supplyTransactions = transactions.filter(tx => 
    tx.transactionType === 'supply' || tx.transactionType === 'withdraw'
  ).sort((a, b) => a.timestamp - b.timestamp);
  
  if (supplyTransactions.length === 0) {
    console.log(`Aucune transaction de dépôt/retrait pour ${token}`);
    return {
      totalInterest: 0,
      dailyDetails: [],
      summary: {
        totalSupplies: 0,
        totalWithdraws: 0,
        currentSupply: 0,
        totalInterest: 0
      }
    };
  }
  
  // Déterminer la période de calcul
  const startTimestamp = getPreviousDayMidnight(supplyTransactions[0].timestamp);
  const endTimestamp = Math.floor(Date.now() / 1000);
  
  console.log(`📅 Période de calcul: ${new Date(startTimestamp * 1000).toISOString()} → ${new Date(endTimestamp * 1000).toISOString()}`);
  
  // Récupérer tous les taux d'intérêt depuis la base de données
  const allRates = await fetchRatesFromDB(token, startTimestamp);
  
  // Créer un Map pour un accès rapide aux taux par date
  const ratesByDate = new Map();
  allRates.forEach(rate => {
    ratesByDate.set(rate.date, rate);
  });
  
  // Variables pour le calcul avec BigInt pour la précision
  let currentSupply = 0n;
  let totalInterest = 0n;
  let totalSupplies = 0n;
  let totalWithdraws = 0n;
  const dailyDetails = [];
  
  // Regrouper les transactions par jour
  const transactionsByDay = new Map();
  supplyTransactions.forEach(tx => {
    const dateKey = formatDateYYYYMMDD(tx.timestamp);
    if (!transactionsByDay.has(dateKey)) {
      transactionsByDay.set(dateKey, []);
    }
    transactionsByDay.get(dateKey).push(tx);
  });
  
  // Calculer jour par jour avec précision intra-journalière
  for (let currentDate = startTimestamp; currentDate <= endTimestamp; currentDate += 86400) {
    const dateKey = formatDateYYYYMMDD(currentDate);
    const formattedDate = new Date(currentDate * 1000).toISOString().split('T')[0];
    
    // Récupérer les transactions du jour
    const dayTransactions = transactionsByDay.get(dateKey) || [];
    
    // Trier les transactions du jour par timestamp
    dayTransactions.sort((a, b) => a.timestamp - b.timestamp);
    
    // Récupérer le taux du jour depuis la DB
    const dailyRate = ratesByDate.get(dateKey);
    const dailyInterestRate = dailyRate ? dailyRate.liquidity_rate_avg / 365 : 0;
    
    let transactionAmount = null;
    let transactionType = null;
    let dayTotalInterest = 0n;
    
    // Cas particulier: Premier jour avec dépôt
    if (currentDate === startTimestamp && dayTransactions.length > 0 && dayTransactions[0].transactionType === 'supply') {
      const firstSupply = dayTransactions[0];
      let amount = 0n;
      amount = BigInt(firstSupply.amount);
      
      currentSupply = amount;
      totalSupplies += amount;
      transactionAmount = amount.toString();
      transactionType = 'supply';
      
      // Pas d'intérêts pour le jour initial de dépôt
      dailyDetails.push({
        date: dateKey,
        timestamp: currentDate,
        supply: currentSupply.toString(),
        dailyRate: dailyInterestRate,
        apr: dailyRate ? dailyRate.liquidity_rate_avg * 100 : 0,
        dailyInterest: "0",
        totalInterest: totalInterest.toString(),
        transactionAmount,
        transactionType
      });
      
      // Traiter les autres transactions du jour si il y en a
      for (let i = 1; i < dayTransactions.length; i++) {
        const tx = dayTransactions[i];
        const txAmount = token === 'USDC' ? 
          BigInt(tx.amount) : 
          BigInt(tx.amount);
        
        if (tx.transactionType === 'supply') {
          currentSupply += txAmount;
          totalSupplies += txAmount;
        } else if (tx.transactionType === 'withdraw') {
          currentSupply -= txAmount;
          totalWithdraws += txAmount;
          if (currentSupply < 0n) currentSupply = 0n;
        }
      }
    }
    // Jours ordinaires
    else if (dayTransactions.length === 0) {
      // Pas de transactions ce jour-là, calcul simple des intérêts sur le montant actuel
      if (currentSupply > 0n && dailyRate) {
        const dayInterest = computeDailyInterest(currentSupply, dailyInterestRate, token === 'USDC' ? 6 : 18);
        dayTotalInterest = dayInterest;
        totalInterest += dayInterest;
        currentSupply += dayInterest;
      }
      
      dailyDetails.push({
        date: dateKey,
        timestamp: currentDate,
        supply: currentSupply.toString(),
        dailyRate: dailyInterestRate,
        apr: dailyRate ? dailyRate.liquidity_rate_avg * 100 : 0,
        dailyInterest: dayTotalInterest.toString(),
        totalInterest: totalInterest.toString(),
        transactionAmount,
        transactionType
      });
    }
    // Jours avec transactions
    else {
      // Il y a des transactions ce jour-là, calcul intra-journalier précis
      const secondsInDay = 86400; // 24 * 60 * 60
      let lastTransactionTime = 0; // Début de la journée en secondes depuis minuit
      let runningAmount = currentSupply;
      
      // Pour chaque transaction du jour
      for (const tx of dayTransactions) {
        // Extraire l'heure, minute, seconde du timestamp
        const txDate = new Date(tx.timestamp * 1000);
        const hours = txDate.getHours();
        const minutes = txDate.getMinutes();
        const seconds = txDate.getSeconds();
        const currentTransactionTime = hours * 3600 + minutes * 60 + seconds;
        
        // Calculer les intérêts pour la période entre la dernière transaction et celle-ci
        if (runningAmount > 0n && dailyRate) {
          const periodSeconds = currentTransactionTime - lastTransactionTime;
          const periodRatio = periodSeconds / secondsInDay;
          const periodRate = dailyInterestRate * periodRatio;
          const periodInterest = computeDailyInterest(runningAmount, periodRate, token === 'USDC' ? 6 : 18);
          
          dayTotalInterest += periodInterest;
          runningAmount += periodInterest;
        }
        
        // Appliquer la transaction (supply ou withdraw)
        let txAmount = 0n;
        if (token === 'USDC') {
          txAmount = BigInt(tx.amount);
        } else {
          txAmount = BigInt(tx.amount);
        }
        
        if (tx.transactionType === 'supply') {
          runningAmount += txAmount;
          totalSupplies += txAmount;
          transactionAmount = txAmount.toString();
          transactionType = 'supply';
        } else if (tx.transactionType === 'withdraw') {
          runningAmount -= txAmount;
          totalWithdraws += txAmount;
          transactionAmount = txAmount.toString();
          transactionType = 'withdraw';
          if (runningAmount < 0n) runningAmount = 0n;
        }
        
        lastTransactionTime = currentTransactionTime;
      }
      
      // Important: Calculer les intérêts pour la période entre la dernière transaction et la fin de la journée
      if (runningAmount > 0n && dailyRate) {
        const remainingSeconds = secondsInDay - lastTransactionTime;
        const remainingRatio = remainingSeconds / secondsInDay;
        const remainingRate = dailyInterestRate * remainingRatio;
        const remainingInterest = computeDailyInterest(runningAmount, remainingRate, token === 'USDC' ? 6 : 18);
        
        dayTotalInterest += remainingInterest;
        runningAmount += remainingInterest;
      }
      
      totalInterest += dayTotalInterest;
      currentSupply = runningAmount;
      
      dailyDetails.push({
        date: dateKey,
        timestamp: currentDate,
        supply: currentSupply.toString(),
        dailyRate: dailyInterestRate,
        apr: dailyRate ? dailyRate.liquidity_rate_avg * 100 : 0,
        dailyInterest: dayTotalInterest.toString(),
        totalInterest: totalInterest.toString(),
        transactionAmount,
        transactionType
      });
    }
  }
  
  console.log(`💰 Calcul terminé: ${dailyDetails.length} jours, total des intérêts: ${Number(totalInterest)} ${token}`);
  
  return {
    totalInterest: totalInterest.toString(),
    dailyDetails,
    summary: {
      totalSupplies: totalSupplies.toString(),
      totalWithdraws: totalWithdraws.toString(),
      currentSupply: currentSupply.toString(),
      totalInterest: totalInterest.toString()
    }
  };
}

/**
 * Calcule les intérêts pour un token donné et retourne un relevé journalier
 */
async function calculateInterestForToken(transactions, token) {
  console.log(`🚀 Calcul des intérêts pour ${token}`);
  
  try {
    // Calculer les intérêts d'emprunt
    const borrowInterest = await calculateBorrowInterest(transactions, token);
    
    // Calculer les intérêts de dépôt
    const supplyInterest = await calculateSupplyInterest(transactions, token);
    
    // Créer un relevé journalier combiné
    const dailyStatement = createDailyStatement(borrowInterest.dailyDetails, supplyInterest.dailyDetails, token);
    
    return {
      token,
      borrow: borrowInterest,
      supply: supplyInterest,
      dailyStatement: dailyStatement,
      summary: {
        totalBorrowInterest: borrowInterest.totalInterest,
        totalSupplyInterest: supplyInterest.totalInterest,
        netInterest: (BigInt(supplyInterest.totalInterest) - BigInt(borrowInterest.totalInterest)).toString()
      }
    };
    
  } catch (error) {
    console.error(`Erreur lors du calcul des intérêts pour ${token}:`, error);
    throw error;
  }
}

/**
 * Crée un relevé journalier combiné au format YYYYMMDD
 */
function createDailyStatement(borrowDetails, supplyDetails, token) {
  console.log(`📊 Création du relevé journalier pour ${token}`);
  
  // Combiner tous les détails journaliers
  const allDailyDetails = [];
  
  // Ajouter les détails d'emprunt
  borrowDetails.forEach(detail => {
    allDailyDetails.push({
      date: detail.date,
      timestamp: detail.timestamp,
      type: 'borrow',
      debt: detail.debt || 0,
      supply: 0,
      dailyRate: detail.dailyRate,
      apr: detail.apr,
      dailyInterest: detail.dailyInterest,
      totalInterest: detail.totalInterest,
      transactionAmount: detail.transactionAmount,
      transactionType: detail.transactionType
    });
  });
  
  // Ajouter les détails de dépôt
  supplyDetails.forEach(detail => {
    allDailyDetails.push({
      date: detail.date,
      timestamp: detail.timestamp,
      type: 'supply',
      debt: 0,
      supply: detail.supply || 0,
      dailyRate: detail.dailyRate,
      apr: detail.apr,
      dailyInterest: detail.dailyInterest,
      totalInterest: detail.totalInterest,
      transactionAmount: detail.transactionAmount,
      transactionType: detail.transactionType
    });
  });
  
  // Grouper par date et créer le relevé journalier
  const dailyStatement = {};
  
  allDailyDetails.forEach(detail => {
    const dateKey = detail.date; // Format YYYYMMDD
    
    if (!dailyStatement[dateKey]) {
      dailyStatement[dateKey] = {
        date: dateKey,
        timestamp: detail.timestamp,
        debt: 0,
        supply: 0,
        borrowInterest: 0,
        supplyInterest: 0,
        totalInterest: 0,
        transactions: []
      };
    }
    
    // Mettre à jour les montants
    if (detail.type === 'borrow') {
      dailyStatement[dateKey].debt = detail.debt;
      dailyStatement[dateKey].borrowInterest = detail.dailyInterest;
    } else {
      dailyStatement[dateKey].supply = detail.supply;
      dailyStatement[dateKey].supplyInterest = detail.dailyInterest;
    }
    
    dailyStatement[dateKey].totalInterest = dailyStatement[dateKey].borrowInterest + dailyStatement[dateKey].supplyInterest;
    
    // Ajouter la transaction si elle existe
    if (detail.transactionAmount) {
      dailyStatement[dateKey].transactions.push({
        type: detail.transactionType,
        amount: detail.transactionAmount
      });
    }
  });
  
  // Convertir en tableau et trier par date
  const statementArray = Object.values(dailyStatement).sort((a, b) => a.timestamp - b.timestamp);
  
  console.log(`📊 Relevé journalier créé: ${statementArray.length} jours pour ${token}`);
  
  return statementArray;
}

module.exports = {
  calculateInterestForToken,
  calculateBorrowInterest,
  calculateSupplyInterest,
  fetchRatesFromDB
}; 