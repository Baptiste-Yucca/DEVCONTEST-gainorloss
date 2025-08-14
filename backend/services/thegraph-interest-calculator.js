const { fetchAllTokenBalances } = require('./graphql');

/**
 * Configuration depuis les variables d'environnement
 */
const GNOSIS_RPC_URL = process.env.GNOSIS_RPC_URL || 'https://rpc.gnosischain.com/';

const TOKENS_V3 = {
  armmUSDC: {
    address: '0xed56f76e9cbc6a64b821e9c016eafbd3db5436d1',
    symbol: 'armmUSDC',
    decimals: 6
  },
  armmWXDAI: {
    address: '0x0ca4f5554dd9da6217d62d8df2816c82bba4157b',
    symbol: 'armmWXDAI',
    decimals: 18
  },
  debtUSDC: {
    address: '0x69c731aE5f5356a779f44C355aBB685d84e5E9e6',
    symbol: 'debtUSDC',
    decimals: 6
  },
  debtWXDAI: {
    address: '0x9908801dF7902675C3FEDD6Fea0294D18D5d5d34',
    symbol: 'debtWXDAI',
    decimals: 18
  }
};

/**
 * Récupère le balanceOf actuel via RPC
 */
async function getCurrentBalances(userAddress) {
  try {
    console.log(`🚀 Récupération RPC des balances pour ${userAddress}`);
    
    // Préparer les appels balanceOf pour tous les tokens
    const calls = Object.entries(TOKENS_V3).map(([key, token], index) => ({
      jsonrpc: "2.0",
      id: index + 1,
      method: "eth_call",
      params: [
        {
          to: token.address,
          data: `0x70a08231000000000000000000000000${userAddress.toLowerCase().slice(2)}`
        },
        "latest"
      ]
    }));
    
    console.log(` Multicall RPC: ${calls.length} tokens`);
    
    const response = await fetch(GNOSIS_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(calls)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Réponse RPC invalide');
    }
    
    // Traiter les résultats
    const balances = {};
    Object.entries(TOKENS_V3).forEach(([key, token], index) => {
      const result = data[index];
      
      if (result && result.result) {
        const hexBalance = result.result;
        const decimalBalance = parseInt(hexBalance, 16).toString();
        
        balances[key] = {
          token: token.address,
          symbol: token.symbol,
          balance: decimalBalance,
          decimals: token.decimals
        };
      } else {
        balances[key] = {
          token: token.address,
          symbol: token.symbol,
          balance: '0',
          decimals: token.decimals
        };
      }
    });
    
    console.log(`✅ Balances RPC récupérées pour ${userAddress}`);
    return balances;

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des balances RPC:', error);
    return null;
  }
}

/**
 * Calcule les intérêts pour les supply tokens (aTokens)
 * Version simplifiée : un seul point par jour (le dernier)
 */
function calculateSupplyInterestFromBalances(atokenBalances, token) {
  console.log(`💰 Calcul des intérêts de supply pour ${token} via TheGraph`);
  
  if (!atokenBalances || atokenBalances.length === 0) {
    return createEmptyResult('supply');
  }

  // Filtrer seulement le token demandé
  const tokenBalances = atokenBalances.filter(balance => 
    balance.userReserve.reserve.symbol === token
  );

  if (tokenBalances.length === 0) {
    return createEmptyResult('supply');
  }

  console.log(`📊 ${tokenBalances.length} balances atoken trouvées pour ${token}`);

  // Trier par timestamp et dédupliquer par jour (garder le dernier)
  const sortedBalances = tokenBalances.sort((a, b) => a.timestamp - b.timestamp);
  const balancesByDay = new Map();
  
  sortedBalances.forEach(balance => {
    const dateKey = formatDateYYYYMMDD(balance.timestamp);
    balancesByDay.set(dateKey, balance); // Le dernier écrase le précédent
  });

  const dailyBalances = Array.from(balancesByDay.values())
    .sort((a, b) => a.timestamp - b.timestamp);

  console.log(`📅 ${dailyBalances.length} jours uniques trouvés (après déduplication)`);

  // Traiter chaque jour
  const dailyDetails = [];
  let totalInterest = 0n;
  let currentSupply = 0n;
  let totalSupplies = 0n;
  let totalWithdraws = 0n;

  for (let i = 0; i < dailyBalances.length; i++) {
    const currentBalance = dailyBalances[i];
    const currentATokenBalance = BigInt(currentBalance.currentATokenBalance);
    const scaledATokenBalance = BigInt(currentBalance.scaledATokenBalance);
    
    let dayTotalInterest = 0n;
    let daySupply = 0n;
    let dayWithdraw = 0n;
    
    if (i === 0) {
      // Premier jour : pas de comparaison possible
      dayTotalInterest = currentATokenBalance - scaledATokenBalance;
    } else {
      // Jour suivant : comparer avec le jour précédent
      const previousBalance = dailyBalances[i - 1];
      const previousATokenBalance = BigInt(previousBalance.currentATokenBalance);
      const previousScaledATokenBalance = BigInt(previousBalance.scaledATokenBalance);
      
      // Calculer les intérêts générés entre les deux jours
      const currentInterest = currentATokenBalance - scaledATokenBalance;
      const previousInterest = previousATokenBalance - previousScaledATokenBalance;
      dayTotalInterest = currentInterest - previousInterest;
      
      // Identifier le type de mouvement
      if (scaledATokenBalance > previousScaledATokenBalance) {
        // Supply : scaled a augmenté
        const supplyAmount = scaledATokenBalance - previousScaledATokenBalance;
        daySupply = supplyAmount;
        totalSupplies += supplyAmount;
      } else if (scaledATokenBalance < previousScaledATokenBalance) {
        // Withdraw : scaled a diminué
        const withdrawAmount = previousScaledATokenBalance - scaledATokenBalance;
        dayWithdraw = withdrawAmount;
        totalWithdraws += withdrawAmount;
      }
    }
    
    // Créer le détail journalier
    const dailyDetail = {
      date: formatDateYYYYMMDD(currentBalance.timestamp),
      timestamp: currentBalance.timestamp,
      supply: currentATokenBalance.toString(),
      dailyInterest: dayTotalInterest > 0n ? dayTotalInterest.toString() : "0",
      totalInterest: (totalInterest + (dayTotalInterest > 0n ? dayTotalInterest : 0n)).toString(),
      transactionAmount: daySupply > 0n ? daySupply.toString() : (dayWithdraw > 0n ? dayWithdraw.toString() : "0"),
      transactionType: daySupply > 0n ? 'supply' : (dayWithdraw > 0n ? 'withdraw' : 'none'),
      source: "real"
    };
    
    dailyDetails.push(dailyDetail);
    totalInterest += dayTotalInterest > 0n ? dayTotalInterest : 0n;
    currentSupply = currentATokenBalance;
  }

  console.log(`✅ Calcul terminé: ${dailyDetails.length} jours, total des intérêts: ${Number(totalInterest)} ${token}`);

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
 * Calcule les intérêts pour les debt tokens (vTokens)
 */
function calculateDebtInterestFromBalances(vtokenBalances, token) {
  console.log(`💰 Calcul des intérêts de dette pour ${token} via TheGraph`);
  
  if (!vtokenBalances || vtokenBalances.length === 0) {
    return createEmptyResult('debt');
  }

  // Filtrer seulement le token demandé
  const tokenBalances = vtokenBalances.filter(balance => 
    balance.userReserve.reserve.symbol === token
  );

  if (tokenBalances.length === 0) {
    return createEmptyResult('debt');
  }

  console.log(`📊 ${tokenBalances.length} balances vtoken trouvées pour ${token}`);

  // Trier par timestamp et dédupliquer par jour (garder le dernier)
  const sortedBalances = tokenBalances.sort((a, b) => a.timestamp - b.timestamp);
  const balancesByDay = new Map();
  
  sortedBalances.forEach(balance => {
    const dateKey = formatDateYYYYMMDD(balance.timestamp);
    balancesByDay.set(dateKey, balance); // Le dernier écrase le précédent
  });

  const dailyBalances = Array.from(balancesByDay.values())
    .sort((a, b) => a.timestamp - b.timestamp);

  // Traiter chaque jour
  const dailyDetails = [];
  let totalInterest = 0n;
  let currentDebt = 0n;
  let totalBorrows = 0n;
  let totalRepays = 0n;

  for (let i = 0; i < dailyBalances.length; i++) {
    const currentBalance = dailyBalances[i];
    const currentVariableDebt = BigInt(currentBalance.currentVariableDebt);
    const scaledVariableDebt = BigInt(currentBalance.scaledVariableDebt);
    
    let dayTotalInterest = 0n;
    let dayBorrow = 0n;
    let dayRepay = 0n;
    
    if (i === 0) {
      // Première balance du jour
      if (currentVariableDebt > currentDebt) {
        const borrowAmount = currentVariableDebt - currentDebt;
        dayBorrow += borrowAmount;
        totalBorrows += borrowAmount;
      } else if (currentVariableDebt < currentDebt) {
        const repayAmount = currentDebt - currentVariableDebt;
        dayRepay += repayAmount;
        totalRepays += repayAmount;
      }
      
      // Intérêts déjà inclus dans currentVariableDebt
      const balanceWithInterest = currentVariableDebt;
      const baseAmount = scaledVariableDebt;
      const interest = balanceWithInterest - baseAmount;
      
      if (interest > 0n) {
        dayTotalInterest += interest;
      }
    } else {
      // Balance suivante
      const previousBalance = dailyBalances[i - 1];
      const previousVariableDebt = BigInt(previousBalance.currentVariableDebt);
      const previousScaledVariableDebt = BigInt(previousBalance.scaledVariableDebt);
      
      // Identifier le type de mouvement
      if (scaledVariableDebt > previousScaledVariableDebt) {
        const borrowAmount = scaledVariableDebt - previousScaledVariableDebt;
        dayBorrow += borrowAmount;
        totalBorrows += borrowAmount;
      } else if (scaledVariableDebt < previousScaledVariableDebt) {
        const repayAmount = previousScaledVariableDebt - scaledVariableDebt;
        dayRepay += repayAmount;
        totalRepays += repayAmount;
      }
      
      // Calculer les intérêts générés
      const currentInterest = currentVariableDebt - scaledVariableDebt;
      const previousInterest = previousVariableDebt - previousScaledVariableDebt;
      const interestGenerated = currentInterest - previousInterest;
      
      if (interestGenerated > 0n) {
        dayTotalInterest += interestGenerated;
      }
    }
    
    // Créer le détail journalier
    const dailyDetail = {
      date: formatDateYYYYMMDD(currentBalance.timestamp),
      timestamp: currentBalance.timestamp,
      debt: currentVariableDebt.toString(),
      dailyInterest: dayTotalInterest.toString(),
      totalInterest: (totalInterest + dayTotalInterest).toString(),
      transactionAmount: dayBorrow > 0n ? dayBorrow.toString() : (dayRepay > 0n ? dayRepay.toString() : "0"),
      transactionType: dayBorrow > 0n ? 'borrow' : (dayRepay > 0n ? 'repay' : 'none'),
      source: "real"
    };
    
    dailyDetails.push(dailyDetail);
    totalInterest += dayTotalInterest;
    currentDebt = currentVariableDebt;
  }

  console.log(`✅ Calcul terminé: ${dailyDetails.length} jours, total des intérêts: ${Number(totalInterest)} ${token}`);

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
 * Calcule les intérêts pour TOUS les tokens en une seule fois
 * Version optimisée avec un seul multicall RPC
 */
async function calculateInterestForAllTokensFromTheGraph(userAddress, req = null) {
  const timerName = req ? req.startTimer(`thegraph_interest_calculation`) : null;
  
  try {
    console.log(`🚀 Calcul des intérêts V3 pour ${userAddress} via TheGraph`);
    
    // Récupérer les balances pour les calculs d'intérêts
    const allBalances = await fetchAllTokenBalances(userAddress, req);
    
    // Récupérer les transactions V3 pour le frontend
    const allTransactions = await fetchAllTransactionsV3(userAddress, req);
    
    // Transformer en format frontend
    const frontendTransactions = transformTransactionsV3ToFrontendFormat(allTransactions);
    
    // Récupérer les balances actuels via RPC
    const currentBalances = await getCurrentBalances(userAddress);
    
    // Calculer les intérêts pour chaque token
    const results = {};
    const tokens = ['USDC', 'WXDAI'];
    
    for (const token of tokens) {
      // Calculer les intérêts d'emprunt
      const borrowInterest = calculateDebtInterestFromBalances(allBalances.vtoken, token);
      
      // Calculer les intérêts de dépôt
      const supplyInterest = calculateSupplyInterestFromBalances(allBalances.atoken, token);
      
      // Ajouter le point "aujourd'hui" si il y a des données historiques
      if (borrowInterest.dailyDetails.length > 0 && currentBalances) {
        const currentDebtBalance = currentBalances[`debt${token}`]?.balance || "0";
        addTodayPoint(borrowInterest.dailyDetails, currentDebtBalance, 'debt', token);
        
        // ❌ SUPPRIMER: Les points estimés hebdomadaires
        // borrowInterest.dailyDetails = addWeeklyEstimatedPoints(...);
      }
      
      if (supplyInterest.dailyDetails.length > 0 && currentBalances) {
        const currentSupplyBalance = currentBalances[`armm${token}`]?.balance || "0";
        addTodayPoint(supplyInterest.dailyDetails, currentSupplyBalance, 'supply', token);
        
        // ❌ SUPPRIMER: Les points estimés hebdomadaires
        // supplyInterest.dailyDetails = addWeeklyEstimatedPoints(...);
      }
      
      // Créer un relevé journalier combiné
      const dailyStatement = createDailyStatement(borrowInterest.dailyDetails, supplyInterest.dailyDetails, token);
      
      results[token] = {
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
    }
    
    if (req) {
      req.stopTimer(`thegraph_interest_calculation`);
      req.logEvent('thegraph_interest_all_tokens_completed', { 
        address: userAddress,
        tokens: Object.keys(results)
      });
    }
    
    return {
      USDC: {
        token: 'USDC',
        borrow: results.USDC.borrow,
        supply: results.USDC.supply,
        summary: results.USDC.summary,
        dailyStatement: results.USDC.dailyStatement,
        transactions: frontendTransactions.USDC.debt.concat(frontendTransactions.USDC.supply)
      },
      WXDAI: {
        token: 'WXDAI',
        borrow: results.WXDAI.borrow,
        supply: results.WXDAI.supply,
        summary: results.WXDAI.summary,
        dailyStatement: results.WXDAI.dailyStatement,
        transactions: frontendTransactions.WXDAI.debt.concat(frontendTransactions.WXDAI.supply)
      },
      // ✅ Transactions V3 pour le frontend
      transactions: frontendTransactions
    };
    
  } catch (error) {
    if (req) {
      req.stopTimer(`thegraph_interest_calculation`);
      req.logEvent('thegraph_interest_all_tokens_error', { 
        address: userAddress,
        error: error.message 
      });
    }
    
    console.error(`❌ Erreur lors du calcul des intérêts TheGraph pour tous les tokens:`, error);
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
      dailyInterest: detail.dailyInterest,
      totalInterest: detail.totalInterest,
      transactionAmount: detail.transactionAmount,
      transactionType: detail.transactionType,
      source: detail.source
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
      dailyInterest: detail.dailyInterest,
      totalInterest: detail.totalInterest,
      transactionAmount: detail.transactionAmount,
      transactionType: detail.transactionType,
      source: detail.source
    });
  });
  
  // Grouper par date et créer le relevé journalier
  const dailyStatement = {};
  
  allDailyDetails.forEach(detail => {
    const dateKey = detail.date;
    
    if (!dailyStatement[dateKey]) {
      dailyStatement[dateKey] = {
        date: dateKey,
        timestamp: detail.timestamp,
        debt: 0,
        supply: 0,
        borrowInterest: 0,
        supplyInterest: 0,
        totalInterest: 0,
        transactions: [],
        source: detail.source
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
    if (detail.transactionAmount && detail.transactionAmount !== "0") {
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

/**
 * Ajoute un point "aujourd'hui" aux dailyDetails
 */
function addTodayPoint(dailyDetails, currentBalance, balanceType, token) {
  if (dailyDetails.length === 0) return dailyDetails;
  
  // Récupérer le dernier point pour avoir le totalInterest
  const lastPoint = dailyDetails[dailyDetails.length - 1];
  
  // Créer le point d'aujourd'hui
  const today = new Date();
  const todayDate = formatDateYYYYMMDD(Math.floor(today.getTime() / 1000));
  const todayTimestamp = Math.floor(today.getTime() / 1000);
  
  const todayPoint = {
    date: todayDate,
    timestamp: todayTimestamp,
    [balanceType]: currentBalance, // 'debt' ou 'supply'
    dailyInterest: "0",
    totalInterest: lastPoint.totalInterest, // Même que le dernier point
    transactionAmount: currentBalance,
    transactionType: "BalanceOf",
    source: "real"
  };
  
  // Ajouter le point d'aujourd'hui
  dailyDetails.push(todayPoint);
  
  console.log(`📅 Point d'aujourd'hui ajouté: ${todayDate} - ${balanceType}: ${currentBalance}`);
  
  return dailyDetails;
}

/**
 * Crée un résultat vide pour les cas sans données
 */
function createEmptyResult(type) {
  const emptySummary = type === 'supply' 
    ? {
        totalSupplies: "0",
        totalWithdraws: "0",
        currentSupply: "0",
        totalInterest: "0"
      }
    : {
        totalBorrows: "0",
        totalRepays: "0",
        currentDebt: "0",
        totalInterest: "0"
      };

  return {
    totalInterest: "0",
    dailyDetails: [],
    summary: emptySummary
  };
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

// Importer le nouveau service V3
const { fetchAllTransactionsV3, transformTransactionsV3ToFrontendFormat } = require('./fetch-transactions');

module.exports = {
  calculateInterestForAllTokensFromTheGraph,
  calculateSupplyInterestFromBalances,
  calculateDebtInterestFromBalances,
  createDailyStatement
};
