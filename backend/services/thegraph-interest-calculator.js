const { fetchAllTokenBalances } = require('./graphql');

// Importer la fonction RPC depuis balances.js
// Note: balances.js exporte un router, pas des fonctions individuelles
// Il faut soit exporter les fonctions, soit les copier ici

/**
 * Récupère le balanceOf actuel via RPC
 * Copié depuis balances.js car les fonctions ne sont pas exportées
 */
async function getCurrentBalances(userAddress) {
  try {
    // Configuration RPC Gnosis
    const GNOSIS_RPC_URL = 'https://rpc.gnosischain.com/';
    
    // Adresses des tokens V3
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
    
    console.log(`🚀 Récupération RPC des balances pour ${userAddress}`);
    
    // Préparer les appels balanceOf pour tous les tokens
    const calls = Object.entries(TOKENS_V3).map(([key, token], index) => ({
      jsonrpc: "2.0",
      id: index + 1,
      method: "eth_call",
      params: [
        {
          to: token.address,
          data: `0x70a08231000000000000000000000000${userAddress.toLowerCase().slice(2)}` // balanceOf(address)
        },
        "latest"
      ]
    }));
    
    console.log(` Multicall RPC: ${calls.length} tokens`);
    
    const response = await fetch(GNOSIS_RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
        // Convertir l'hex en décimal
        const hexBalance = result.result;
        const decimalBalance = parseInt(hexBalance, 16).toString();
        
        balances[key] = {
          token: token.address,
          symbol: token.symbol,
          balance: decimalBalance,
          decimals: token.decimals
        };
      } else {
        // Fallback en cas d'erreur
        balances[key] = {
          token: token.address,
          symbol: token.symbol,
          balance: '0',
          decimals: token.decimals
        };
      }
    });
    
    console.log(`✅ Balances RPC récupérées pour ${userAddress}:`, balances);
    return balances;

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des balances RPC:', error);
    return null;
  }
}

/**
 * Calcule les intérêts pour les supply tokens (aTokens)
 */
function calculateSupplyInterestFromBalances(atokenBalances, token) {
  console.log(`💰 Calcul des intérêts de supply pour ${token} via TheGraph`);
  
  if (!atokenBalances || atokenBalances.length === 0) {
    return {
      totalInterest: "0",
      dailyDetails: [],
      summary: {
        totalSupplies: "0",
        totalWithdraws: "0",
        currentSupply: "0",
        totalInterest: "0"
      }
    };
  }

  // Filtrer seulement le token demandé
  const tokenBalances = atokenBalances.filter(balance => 
    balance.userReserve.reserve.symbol === token
  );

  if (tokenBalances.length === 0) {
    return {
      totalInterest: "0",
      dailyDetails: [],
      summary: {
        totalSupplies: "0",
        totalWithdraws: "0",
        currentSupply: "0",
        totalInterest: "0"
      }
    };
  }

  console.log(`📊 ${tokenBalances.length} balances atoken trouvées pour ${token}`);

  // Trier par timestamp (plus ancien en premier)
  const sortedBalances = tokenBalances.sort((a, b) => a.timestamp - b.timestamp);
  const decimals = sortedBalances[0].userReserve.reserve.decimals;
  
  const dailyDetails = [];
  let totalInterest = 0n;
  let currentSupply = 0n;
  let totalSupplies = 0n;
  let totalWithdraws = 0n;

  // Grouper les balances par jour (YYYYMMDD)
  const balancesByDay = new Map();
  
  sortedBalances.forEach(balance => {
    const dateKey = formatDateYYYYMMDD(balance.timestamp);
    if (!balancesByDay.has(dateKey)) {
      balancesByDay.set(dateKey, []);
    }
    balancesByDay.get(dateKey).push(balance);
  });

  // Traiter chaque jour
  for (const [dateKey, dayBalances] of balancesByDay) {
    // Trier les balances du jour par timestamp
    dayBalances.sort((a, b) => a.timestamp - b.timestamp);
    
    let dayTotalInterest = 0n;
    let daySupply = 0n;
    let dayWithdraw = 0n;
    
    // Pour chaque balance du jour
    for (let i = 0; i < dayBalances.length; i++) {
      const currentBalance = dayBalances[i];
      const currentATokenBalance = BigInt(currentBalance.currentATokenBalance);
      const scaledATokenBalance = BigInt(currentBalance.scaledATokenBalance);
      
      if (i === 0) {
        // Première balance du jour
        if (currentATokenBalance > currentSupply) {
          // Supply : la différence est un nouveau dépôt
          const supplyAmount = currentATokenBalance - currentSupply;
          daySupply += supplyAmount;
          totalSupplies += supplyAmount;
        } else if (currentATokenBalance < currentSupply) {
          // Withdraw : la différence est un retrait
          const withdrawAmount = currentSupply - currentATokenBalance;
          dayWithdraw += withdrawAmount;
          totalWithdraws += withdrawAmount;
        }
        
        // Les intérêts sont la différence entre current et scaled (moins les mouvements)
        const balanceWithInterest = currentATokenBalance;
        const baseAmount = scaledATokenBalance;
        const interest = balanceWithInterest - baseAmount;
        
        if (interest > 0n) {
          dayTotalInterest += interest;
        }
      } else {
        // Balance suivante dans la journée
        const previousBalance = dayBalances[i - 1];
        const previousATokenBalance = BigInt(previousBalance.currentATokenBalance);
        const previousScaledATokenBalance = BigInt(previousBalance.scaledATokenBalance);
        
        // Identifier le type de mouvement
        if (scaledATokenBalance > previousScaledATokenBalance) {
          // Supply : scaled a augmenté
          const supplyAmount = scaledATokenBalance - previousScaledATokenBalance;
          daySupply += supplyAmount;
          totalSupplies += supplyAmount;
        } else if (scaledATokenBalance < previousScaledATokenBalance) {
          // Withdraw : scaled a diminué
          const withdrawAmount = previousScaledATokenBalance - scaledATokenBalance;
          dayWithdraw += withdrawAmount;
          totalWithdraws += withdrawAmount;
        }
        
        // Calculer les intérêts générés entre les deux balances
        const currentInterest = currentATokenBalance - scaledATokenBalance;
        const previousInterest = previousATokenBalance - previousScaledATokenBalance;
        const interestGenerated = currentInterest - previousInterest;
        
        if (interestGenerated > 0n) {
          dayTotalInterest += interestGenerated;
        }
      }
      
      currentSupply = currentATokenBalance;
    }
    
    // Créer le détail journalier
    const lastBalance = dayBalances[dayBalances.length - 1];
    const dailyDetail = {
      date: dateKey,
      timestamp: lastBalance.timestamp,
      supply: currentSupply.toString(),
      dailyInterest: dayTotalInterest.toString(),
      totalInterest: (totalInterest + dayTotalInterest).toString(),
      transactionAmount: daySupply > 0n ? daySupply.toString() : (dayWithdraw > 0n ? dayWithdraw.toString() : "0"),
      transactionType: daySupply > 0n ? 'supply' : (dayWithdraw > 0n ? 'withdraw' : 'none'),
      source: "real"
    };
    
    dailyDetails.push(dailyDetail);
    totalInterest += dayTotalInterest;
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
    return {
      totalInterest: "0",
      dailyDetails: [],
      summary: {
        totalBorrows: "0",
        totalRepays: "0",
        currentDebt: "0",
        totalInterest: "0"
      }
    };
  }

  // Filtrer seulement le token demandé
  const tokenBalances = vtokenBalances.filter(balance => 
    balance.userReserve.reserve.symbol === token
  );

  if (tokenBalances.length === 0) {
    return {
      totalInterest: "0",
      dailyDetails: [],
      summary: {
        totalBorrows: "0",
        totalRepays: "0",
        currentDebt: "0",
        totalInterest: "0"
      }
    };
  }

  console.log(`📊 ${tokenBalances.length} balances vtoken trouvées pour ${token}`);

  // Trier par timestamp (plus ancien en premier)
  const sortedBalances = tokenBalances.sort((a, b) => a.timestamp - b.timestamp);
  
  const dailyDetails = [];
  let totalInterest = 0n;
  let currentDebt = 0n;
  let totalBorrows = 0n;
  let totalRepays = 0n;

  // Grouper les balances par jour
  const balancesByDay = new Map();
  
  sortedBalances.forEach(balance => {
    const dateKey = formatDateYYYYMMDD(balance.timestamp);
    if (!balancesByDay.has(dateKey)) {
      balancesByDay.set(dateKey, []);
    }
    balancesByDay.get(dateKey).push(balance);
  });

  // Traiter chaque jour
  for (const [dateKey, dayBalances] of balancesByDay) {
    dayBalances.sort((a, b) => a.timestamp - b.timestamp);
    
    let dayTotalInterest = 0n;
    let dayBorrow = 0n;
    let dayRepay = 0n;
    
    for (let i = 0; i < dayBalances.length; i++) {
      const currentBalance = dayBalances[i];
      const currentVariableDebt = BigInt(currentBalance.currentVariableDebt);
      const scaledVariableDebt = BigInt(currentBalance.scaledVariableDebt);
      
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
        const previousBalance = dayBalances[i - 1];
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
      
      currentDebt = currentVariableDebt;
    }
    
    // Créer le détail journalier
    const lastBalance = dayBalances[dayBalances.length - 1];
    const dailyDetail = {
      date: dateKey,
      timestamp: lastBalance.timestamp,
      debt: currentDebt.toString(),
      dailyInterest: dayTotalInterest.toString(),
      totalInterest: (totalInterest + dayTotalInterest).toString(),
      transactionAmount: dayBorrow > 0n ? dayBorrow.toString() : (dayRepay > 0n ? dayRepay.toString() : "0"),
      transactionType: dayBorrow > 0n ? 'borrow' : (dayRepay > 0n ? 'repay' : 'none'),
      source: "real"
    };
    
    dailyDetails.push(dailyDetail);
    totalInterest += dayTotalInterest;
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
 * Calcule les intérêts pour un token donné en utilisant TheGraph
 * Retourne le même format que l'ancien système
 */
async function calculateInterestForTokenFromTheGraph(userAddress, token, req = null) {
  const timerName = req ? req.startTimer(`thegraph_interest_${token}`) : null;
  
  console.log(`🚀 Calcul des intérêts pour ${token} via TheGraph`);
  
  try {
    // Récupérer tous les balances depuis TheGraph
    const allBalances = await fetchAllTokenBalances(userAddress, req);
    
    // Récupérer les balances actuels via RPC
    const currentBalances = await getCurrentBalances(userAddress);
    
    // Calculer les intérêts d'emprunt
    const borrowInterest = calculateDebtInterestFromBalances(allBalances.vtoken, token);
    
    // Calculer les intérêts de dépôt
    const supplyInterest = calculateSupplyInterestFromBalances(allBalances.atoken, token);
    
    // Ajouter le point "aujourd'hui" si il y a des données historiques
    if (borrowInterest.dailyDetails.length > 0 && currentBalances) {
      const currentDebtBalance = currentBalances[`debt${token}`]?.balance || "0";
      addTodayPoint(borrowInterest.dailyDetails, currentDebtBalance, 'debt', token);
    }
    
    if (supplyInterest.dailyDetails.length > 0 && currentBalances) {
      const currentSupplyBalance = currentBalances[`armm${token}`]?.balance || "0";
      addTodayPoint(supplyInterest.dailyDetails, currentSupplyBalance, 'supply', token);
    }
    
    // Créer un relevé journalier combiné (format compatible)
    const dailyStatement = createDailyStatement(borrowInterest.dailyDetails, supplyInterest.dailyDetails, token);
    
    if (req) {
      req.stopTimer(`thegraph_interest_${token}`);
      req.logEvent('thegraph_interest_completed', { 
        token, 
        borrowInterest: borrowInterest.totalInterest,
        supplyInterest: supplyInterest.totalInterest,
        netInterest: (BigInt(supplyInterest.totalInterest) - BigInt(borrowInterest.totalInterest)).toString()
      });
    }
    
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
    if (req) {
      req.stopTimer(`thegraph_interest_${token}`);
      req.logEvent('thegraph_interest_error', { 
        token, 
        error: error.message 
      });
    }
    
    console.error(`❌ Erreur lors du calcul des intérêts TheGraph pour ${token}:`, error);
    throw error;
  }
}

/**
 * Crée un relevé journalier combiné au format YYYYMMDD
 * Copié depuis l'ancien système pour maintenir la compatibilité
 */
function createDailyStatement(borrowDetails, supplyDetails, token) {
  console.log(` Création du relevé journalier pour ${token}`);
  
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
 * Formate une date en YYYYMMDD
 */
function formatDateYYYYMMDD(timestamp) {
  const date = new Date(timestamp * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}${month}${day}`;
}

module.exports = {
  calculateInterestForTokenFromTheGraph,
  calculateSupplyInterestFromBalances,
  calculateDebtInterestFromBalances,
  createDailyStatement
};
