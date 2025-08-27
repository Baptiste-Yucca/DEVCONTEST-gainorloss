const { GraphQLClient } = require('graphql-request');

// Configuration TheGraph
const THEGRAPH_URL = 'https://api.thegraph.com/subgraphs/id/QmVH7ota6caVV2ceLY91KYYh6BJs2zeMScTTYgKDpt7VRg';
const API_KEY = process.env.THEGRAPH_API_KEY;

// Client GraphQL
const client = new GraphQLClient(THEGRAPH_URL, {
  headers: API_KEY ? {
    'Authorization': `Bearer ${API_KEY}`
  } : {}
});

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
 * Récupère tous les atokenBalanceHistoryItems avec pagination
 */
async function fetchAllATokenBalances(userAddress) {

  const LIMIT = 1000; // Limite TheGraph par défaut
  const allBalances = [];
  let skip = 0;
  let hasMore = true;
  
  try {

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
     
      // Vérifier s'il y a plus de données
      if (balances.length < LIMIT) {
        hasMore = false;
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
   
      // Vérifier s'il y a plus de données
      if (balances.length < LIMIT) {
        hasMore = false;
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
async function fetchAllTokenBalances(userAddress) {

  
  try {
    console.log(`🚀 Récupération de tous les balances pour ${userAddress}`);
    
    // Récupérer en parallèle pour optimiser
    const [atokenBalances, vtokenBalances] = await Promise.all([
      fetchAllATokenBalances(userAddress),
      fetchAllVTokenBalances(userAddress)
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
  fetchAllATokenBalances,
  fetchAllVTokenBalances,
  fetchAllTokenBalances,
  // Queries exportées pour référence
  sTokenBalance_QUERY,
  dTokenBalance_QUERY
};