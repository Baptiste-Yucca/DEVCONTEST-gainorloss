const { GraphQLClient } = require('graphql-request');
const { fetchTokenTransfersWithFallback } = require('./moralis');

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
      reserve { id }
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
      reserve { id }
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

// Requête GraphQL pour les nouvelles transactions seulement
const NEW_TRANSACTIONS_QUERY = `
  query GetNewTransactions($userAddress: String!, $fromTimestamp: Int!) {
    borrows: borrows(
      first: 1000, 
      where: { 
        user_: { id: $userAddress }
        timestamp_gt: $fromTimestamp
      }, 
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
        timestamp_gt: $fromTimestamp
        reserve_in: [
          "0xddafbb505ad214d7b80b1f830fccc89b60fb7a830xdaa06cf7adceb69fcfde68d896818b9938984a70",
          "0xe91d153e0b41518a2ce8dd3d7944fa863463a97d0xdaa06cf7adceb69fcfde68d896818b9938984a70"
        ]
      }
      orderBy: timestamp, 
      orderDirection: asc
    ) {
      txHash
      reserve { id }
      amount
      timestamp
    }
    
    withdraws: redeemUnderlyings(
      first: 1000, 
      where: { 
        user_: { id: $userAddress }
        timestamp_gt: $fromTimestamp
      }, 
      orderBy: timestamp, 
      orderDirection: asc
    ) {
      txHash
      reserve { id }
      amount
      timestamp
    }
    
    repays: repays(
      first: 1000, 
      where: { 
        user_: { id: $userAddress }
        timestamp_gt: $fromTimestamp
      }, 
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

// Anciennes requêtes (gardées pour référence)
const BORROWS_QUERY = `
  query GetBorrows($userAddress: String!) {
    borrows(
      first: 1000, 
      where: { user_: { id: $userAddress } }, 
      orderBy: timestamp, 
      orderDirection: asc
    ) {
      # id - inutile, redondant avec txHash
      txHash
      # user { id } - inutile, on connaît déjà l'adresse
      reserve { id }
      amount
      # borrowRate - inutile, évolue constamment
      # borrowRateMode - inutile, toujours = 2
      timestamp
    }
  }
`;

const SUPPLIES_QUERY = `
  query GetSupplies($userAddress: String!) {
    supplies(
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
      # id - inutile, redondant avec txHash
      txHash
      # user { id } - inutile, on connaît déjà l'adresse
      reserve { id }
      amount
      timestamp
    }
  }
`;

const WITHDRAWS_QUERY = `
  query GetWithdraws($userAddress: String!) {
    redeemUnderlyings(
      first: 1000, 
      where: { user_: { id: $userAddress } }, 
      orderBy: timestamp, 
      orderDirection: asc
    ) {
      # id - inutile, redondant avec txHash
      txHash
      # user { id } - inutile, on connaît déjà l'adresse
      reserve { id }
      amount
      timestamp
    }
  }
`;

const REPAYS_QUERY = `
  query GetRepays($userAddress: String!) {
    repays(
      first: 1000, 
      where: { user_: { id: $userAddress } }, 
      orderBy: timestamp, 
      orderDirection: asc
    ) {
      # id - inutile, redondant avec txHash
      txHash
      # user { id } - inutile, on connaît déjà l'adresse
      reserve { id }
      amount
      timestamp
    }
  }
`;


const sTokenBalance_QUERY = `query ATokenMovements($user: String!) {
  atokenBalanceHistoryItems(
    where: { userReserve_: { user: $user } } 
    orderBy: timestamp
    orderDirection: asc
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

const bTokenBalance_QUERY = `query ATokenMovements($user: String!) {
  vtokenBalanceHistoryItems(
    where: { userReserve_: { user: $user } }   # ← filtre sur l’utilisateur
    orderBy: timestamp
    orderDirection: asc
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
  const timerName = req ? req.startTimer('graphql_all_transactions_optimized') : null;
  
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
    
    if (req) {
      req.stopTimer('graphql_all_transactions_optimized');
      req.logEvent('graphql_all_transactions_optimized_completed', { 
        address: userAddress,
        borrows: borrows.length,
        supplies: supplies.length,
        withdraws: withdraws.length,
        repays: repays.length,
        tokenTransfers: tokenTransfers.total,
        total: borrows.length + supplies.length + withdraws.length + repays.length + tokenTransfers.total
      });
    }
    
    return {
      borrows,
      supplies,
      withdraws,
      repays,
      tokenTransfers,
      total: borrows.length + supplies.length + withdraws.length + repays.length + tokenTransfers.total
    };
    
  } catch (error) {
    if (req) {
      req.stopTimer('graphql_all_transactions_optimized');
      req.logEvent('graphql_all_transactions_optimized_error', { 
        address: userAddress, 
        error: error.message 
      });
    }
    
    console.error('Erreur lors de la récupération optimisée de toutes les transactions:', error);
    throw error;
  }
}

/**
 * Récupère seulement les nouvelles transactions depuis un timestamp donné
 */
async function fetchNewTransactions(userAddress, fromTimestamp, req = null) {
  const timerName = req ? req.startTimer('graphql_new_transactions') : null;
  
  try {
    console.log(`🆕 Récupération des nouvelles transactions pour ${userAddress} depuis ${new Date(fromTimestamp * 1000).toISOString()}`);
    
    const variables = { 
      userAddress: userAddress.toLowerCase(),
      fromTimestamp: fromTimestamp
    };
    const data = await client.request(NEW_TRANSACTIONS_QUERY, variables);
    
    // Extraire les données avec les bonnes clés
    const borrows = data.borrows || [];
    const supplies = data.supplies || [];
    const withdraws = data.withdraws || [];
    const repays = data.repays || [];
    
    // Récupérer tous les hashes des nouvelles transactions
    const newTxHashes = [
      ...borrows.map(tx => tx.txHash),
      ...supplies.map(tx => tx.txHash),
      ...withdraws.map(tx => tx.txHash),
      ...repays.map(tx => tx.txHash)
    ];
    
    console.log(`📊 ${newTxHashes.length} nouvelles transactions TheGraph récupérées`);
    
    // Récupérer les nouveaux transferts de tokens via Gnosisscan
    const tokenTransfers = await fetchTokenTransfersWithFallback(userAddress, newTxHashes, req);
    
    if (req) {
      req.stopTimer('graphql_new_transactions');
      req.logEvent('graphql_new_transactions_completed', { 
        address: userAddress,
        fromTimestamp,
        borrows: borrows.length,
        supplies: supplies.length,
        withdraws: withdraws.length,
        repays: repays.length,
        tokenTransfers: tokenTransfers.total,
        total: borrows.length + supplies.length + withdraws.length + repays.length + tokenTransfers.total
      });
    }
    
    return {
      borrows,
      supplies,
      withdraws,
      repays,
      tokenTransfers,
      total: borrows.length + supplies.length + withdraws.length + repays.length + tokenTransfers.total
    };
    
  } catch (error) {
    if (req) {
      req.stopTimer('graphql_new_transactions');
      req.logEvent('graphql_new_transactions_error', { 
        address: userAddress, 
        fromTimestamp,
        error: error.message 
      });
    }
    
    console.error('Erreur lors de la récupération des nouvelles transactions:', error);
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

module.exports = {
  fetchBorrows,
  fetchSupplies,
  fetchWithdraws,
  fetchRepays,
  fetchAllTransactions,
  fetchNewTransactions
}; 