const { GraphQLClient } = require('graphql-request');
const { fetchTokenTransfers: fetchGnosisScanTransfers } = require('./gnosisscan');

// Fonction de remplacement pour fetchTokenTransfersWithFallback
async function fetchTokenTransfersWithFallback(userAddress, existingTxHashes = [], req = null) {
  try {
    console.log(`🔄 Récupération des transferts de tokens pour ${userAddress} via GnosisScan`);
    
    const existingHashSet = new Set(existingTxHashes);
    const allTransfers = [];
    
    // Récupérer les adresses des tokens de supply depuis les constantes
    const supplyTokenAddresses = {
      'USDC': '0x0cA4f5554Dd9Da6217d62D8df2816c82bba4157b',
      'WXDAI': '0xe91d153e0b41518a2ce8dd3d7944fa863463a97d'
    };
    
    // Utiliser directement GnosisScan pour chaque token
    for (const [tokenSymbol, contractAddress] of Object.entries(supplyTokenAddresses)) {
      try {
        const transfers = await fetchGnosisScanTransfers(userAddress, contractAddress, req);
        
        // Filtrer les transactions déjà récupérées
        const newTransfers = transfers.filter(tx => !existingHashSet.has(tx.hash));
        
        allTransfers.push(...newTransfers);
        
        console.log(`📊 GnosisScan: ${newTransfers.length} nouveaux transferts ${tokenSymbol}`);
        
        // Délai entre les requêtes pour respecter les limites
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`❌ Erreur GnosisScan pour ${tokenSymbol}:`, error.message);
      }
    }
    
    // Séparer les transactions par type
    const usdcTransfers = allTransfers
      .filter(tx => tx.contractAddress === supplyTokenAddresses['USDC'])
      .map(tx => {
        const { tokenSymbol, ...txWithoutSymbol } = tx;
        return txWithoutSymbol;
      });
    
    const wxdaiTransfers = allTransfers
      .filter(tx => tx.contractAddress === supplyTokenAddresses['WXDAI'])
      .map(tx => {
        const { tokenSymbol, ...txWithoutSymbol } = tx;
        return txWithoutSymbol;
      });
    
    const otherTransfers = allTransfers
      .filter(tx => !supplyTokenAddresses[Object.values(supplyTokenAddresses).includes(tx.contractAddress)])
      .map(tx => {
        const { tokenSymbol, ...txWithoutSymbol } = tx;
        return txWithoutSymbol;
      });
    
    console.log(`✅ Total: ${usdcTransfers.length} USDC, ${wxdaiTransfers.length} WXDAI, ${otherTransfers.length} autres`);
    
    return {
      usdc: usdcTransfers,
      armmwxdai: wxdaiTransfers,
      others: otherTransfers,
      total: allTransfers.length
    };
    
  } catch (error) {
    console.error(`❌ Erreur lors de la récupération des transferts de tokens:`, error);
    return {
      usdc: [],
      armmwxdai: [],
      others: [],
      total: 0
    };
  }
}

// Configuration TheGraph
const THEGRAPH_URL = 'https://api.thegraph.com/subgraphs/id/QmVH7ota6caVV2ceLY91KYYh6BJs2zeMScTTYgKDpt7VRg';
const API_KEY = process.env.THEGRAPH_API_KEY;

// Client GraphQL
const client = new GraphQLClient(THEGRAPH_URL, {
  headers: API_KEY ? {
    'Authorization': `Bearer ${API_KEY}`
  } : {}
});

// Requête GraphQL optimisée - une seule requête pour toutes les transactions
const ALL_TRANSACTIONS_QUERY = `
  query GetAllTransactions($userAddress: String!) {
    borrows: borrows(
      first: 1000, 
      where: { user_: { id: $userAddress } }, 
      orderBy: timestamp, 
      orderDirection: asc
    ) {
      txHash
      reserve { id }
      amount
      timestamp
    }
    
    supplies: supplies(
      first: 1000, 
      where: {
        user_: { id: $userAddress }
        reserve_in: [
          "0xddafbb505ad214d7b80b1f830fccc89b60fb7a830xdaa06cf7adceb69fcfde68d896818b9938984a70",
          "0xe91d153e0b41518a2ce8dd3d7944fa863463a97d0xdaa06cf7adceb69fcfde68d896818b9938984a70"
        ]
      }
      orderBy: timestamp, 
      orderDirection: asc
    ) {
      txHash
      reserve { 
        id 
        symbol
      }
      amount
      timestamp
    }
    
    withdraws: redeemUnderlyings(
      first: 1000, 
      where: { user_: { id: $userAddress } }, 
      orderBy: timestamp, 
      orderDirection: asc
    ) {
      txHash
      reserve { 
        id 
        symbol
      }
      amount
      timestamp
    }
    
    repays: repays(
      first: 1000, 
      where: { user_: { id: $userAddress } }, 
      orderBy: timestamp, 
      orderDirection: asc
    ) {
      txHash
      reserve { id }
      amount
      timestamp
    }
  }
`;

const sTokenBalance_QUERY = `query ATokenMovements($user: String!, $first: Int!, $skip: Int!) {
  atokenBalanceHistoryItems(
    where: { userReserve_: { user: $user } } 
    orderBy: timestamp
    orderDirection: asc
    first: $first
    skip: $skip
  ) {
    timestamp
    currentATokenBalance
    scaledATokenBalance
    index
    userReserve {
      reserve { symbol decimals }
    }
  }
}
`;

const dTokenBalance_QUERY = `query VTokenMovements($user: String!, $first: Int!, $skip: Int!) {
  vtokenBalanceHistoryItems(
    where: { userReserve_: { user: $user } }
    orderBy: timestamp
    orderDirection: asc
    first: $first
    skip: $skip
  ) {
    timestamp
    currentVariableDebt
    scaledVariableDebt
    index
    userReserve {
      reserve { symbol decimals }
    }
  }
}`;

/**
 * Récupère toutes les transactions d'une adresse en une seule requête optimisée
 */
async function fetchAllTransactions(userAddress, req = null) {

  
  try {
    console.log(`🚀 Récupération optimisée de toutes les transactions pour ${userAddress}`);
    
    const variables = { userAddress: userAddress.toLowerCase() };
    const data = await client.request(ALL_TRANSACTIONS_QUERY, variables);
    
    // Extraire les données avec les bonnes clés
    const borrows = data.borrows || [];
    const supplies = data.supplies || [];
    const withdraws = data.withdraws || [];
    const repays = data.repays || [];
    
    // Récupérer tous les hashes des transactions déjà obtenues
    const existingTxHashes = [
      ...borrows.map(tx => tx.txHash),
      ...supplies.map(tx => tx.txHash),
      ...withdraws.map(tx => tx.txHash),
      ...repays.map(tx => tx.txHash)
    ];
    
    console.log(`📊 ${existingTxHashes.length} transactions TheGraph récupérées en une seule requête`);
    
    // Récupérer les transferts de tokens via Gnosisscan (en excluant ceux déjà trouvés)
    const tokenTransfers = await fetchTokenTransfersWithFallback(userAddress, existingTxHashes, req);
    
    return {
      borrows,
      supplies,
      withdraws,
      repays,
      tokenTransfers,
      total: borrows.length + supplies.length + withdraws.length + repays.length + tokenTransfers.total
    };
    
  } catch (error) {    
    console.error('Erreur lors de la récupération optimisée de toutes les transactions:', error);
    throw error;
  }
}


// Fonctions individuelles gardées pour compatibilité (mais dépréciées)
async function fetchBorrows(userAddress, req = null) {
  console.warn('⚠️ fetchBorrows() est déprécié, utilisez fetchAllTransactions()');
  const allTransactions = await fetchAllTransactions(userAddress, req);
  return allTransactions.borrows;
}

async function fetchSupplies(userAddress, req = null) {
  console.warn('⚠️ fetchSupplies() est déprécié, utilisez fetchAllTransactions()');
  const allTransactions = await fetchAllTransactions(userAddress, req);
  return allTransactions.supplies;
}

async function fetchWithdraws(userAddress, req = null) {
  console.warn('⚠️ fetchWithdraws() est déprécié, utilisez fetchAllTransactions()');
  const allTransactions = await fetchAllTransactions(userAddress, req);
  return allTransactions.withdraws;
}

async function fetchRepays(userAddress, req = null) {
  console.warn('⚠️ fetchRepays() est déprécié, utilisez fetchAllTransactions()');
  const allTransactions = await fetchAllTransactions(userAddress, req);
  return allTransactions.repays;
}

/**
 * Récupère tous les atokenBalanceHistoryItems avec pagination
 */
async function fetchAllATokenBalances(userAddress, req = null) {

  const LIMIT = 1000; // Limite TheGraph par défaut
  const allBalances = [];
  let skip = 0;
  let hasMore = true;
  
  try {
    console.log(`🔍 Récupération de tous les atokenBalanceHistoryItems pour ${userAddress}`);
    
    while (hasMore) {
      const variables = { 
        user: userAddress.toLowerCase(),
        first: LIMIT,
        skip: skip
      };
      
      const data = await client.request(sTokenBalance_QUERY, variables);
      const balances = data.atokenBalanceHistoryItems || [];
      
      // Filtrer seulement USDC et WXDAI
      const filteredBalances = balances.filter(item => {
        const symbol = item.userReserve?.reserve?.symbol;
        return symbol === 'USDC' || symbol === 'WXDAI';
      });
      
      allBalances.push(...filteredBalances);
      console.log(` Batch ${Math.floor(skip/LIMIT) + 1}: ${balances.length} balances, ${filteredBalances.length} filtrées (USDC/WXDAI)`);
      
      // Vérifier s'il y a plus de données
      if (balances.length < LIMIT) {
        hasMore = false;
        console.log(`✅ Fin de pagination: ${balances.length} < ${LIMIT}`);
      } else {
        skip += LIMIT;
        console.log(`⏭️  Pagination suivante: skip=${skip}`);
      }
    }
    
    console.log(`🎯 Total: ${allBalances.length} balances atoken (USDC/WXDAI) récupérées`);
    
    return allBalances;
    
  } catch (error) {  
    console.error('❌ Erreur lors de la récupération des atoken balances:', error);
    throw error;
  }
}

/**
 * Récupère tous les vtokenBalanceHistoryItems avec pagination
 */
async function fetchAllVTokenBalances(userAddress, req = null) {

  const LIMIT = 1000; // Limite TheGraph par défaut
  const allBalances = [];
  let skip = 0;
  let hasMore = true;
  
  try {
    console.log(`🔍 Récupération de tous les vtokenBalanceHistoryItems pour ${userAddress}`);
    
    while (hasMore) {
      const variables = { 
        user: userAddress.toLowerCase(),
        first: LIMIT,
        skip: skip
      };
      
      const data = await client.request(dTokenBalance_QUERY, variables);
      const balances = data.vtokenBalanceHistoryItems || [];
      
      // Filtrer seulement USDC et WXDAI
      const filteredBalances = balances.filter(item => {
        const symbol = item.userReserve?.reserve?.symbol;
        return symbol === 'USDC' || symbol === 'WXDAI';
      });
      
      allBalances.push(...filteredBalances);
      console.log(` Batch ${Math.floor(skip/LIMIT) + 1}: ${balances.length} balances, ${filteredBalances.length} filtrées (USDC/WXDAI)`);
      
      // Vérifier s'il y a plus de données
      if (balances.length < LIMIT) {
        hasMore = false;
        console.log(`✅ Fin de pagination: ${balances.length} < ${LIMIT}`);
      } else {
        skip += LIMIT;
        console.log(`⏭️  Pagination suivante: skip=${skip}`);
      }
    }
    
    console.log(`🎯 Total: ${allBalances.length} balances vtoken (USDC/WXDAI) récupérées`);
    
    return allBalances;
    
  } catch (error) {
 
    console.error('❌ Erreur lors de la récupération des vtoken balances:', error);
    throw error;
  }
}

/**
 * Récupère tous les balances (atoken + vtoken) avec pagination
 */
async function fetchAllTokenBalances(userAddress, req = null) {

  
  try {
    console.log(`🚀 Récupération de tous les balances pour ${userAddress}`);
    
    // Récupérer en parallèle pour optimiser
    const [atokenBalances, vtokenBalances] = await Promise.all([
      fetchAllATokenBalances(userAddress, req),
      fetchAllVTokenBalances(userAddress, req)
    ]);
    
    const result = {
      atoken: atokenBalances,
      vtoken: vtokenBalances,
      total: atokenBalances.length + vtokenBalances.length
    };
    
    console.log(`🎯 Total combiné: ${result.total} balances récupérées`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de tous les balances:', error);
    throw error;
  }
}

module.exports = {
  fetchBorrows,
  fetchSupplies,
  fetchWithdraws,
  fetchRepays,
  fetchAllTransactions,

  // Nouvelles fonctions pour les balances
  fetchAllATokenBalances,
  fetchAllVTokenBalances,
  fetchAllTokenBalances,
  // Queries exportées pour référence
  sTokenBalance_QUERY,
  dTokenBalance_QUERY
};