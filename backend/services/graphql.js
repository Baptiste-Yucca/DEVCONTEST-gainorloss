const { GraphQLClient } = require('graphql-request');

// Configuration TheGraph
const THEGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/realtoken-thegraph/rmm-gnosis';
const API_KEY = process.env.THEGRAPH_API_KEY;

// Client GraphQL
const client = new GraphQLClient(THEGRAPH_URL, {
  headers: API_KEY ? {
    'Authorization': `Bearer ${API_KEY}`
  } : {}
});

// Requêtes GraphQL
const BORROWS_QUERY = `
  query GetBorrows($user: String!, $first: Int!, $skip: Int!) {
    borrows(
      where: { user: $user }
      orderBy: timestamp
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      user
      reserve {
        id
        symbol
        decimals
      }
      amount
      timestamp
      txHash
    }
  }
`;

const SUPPLIES_QUERY = `
  query GetSupplies($user: String!, $first: Int!, $skip: Int!) {
    supplies(
      where: { user: $user }
      orderBy: timestamp
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      user
      reserve {
        id
        symbol
        decimals
      }
      amount
      timestamp
      txHash
    }
  }
`;

const WITHDRAWS_QUERY = `
  query GetWithdraws($user: String!, $first: Int!, $skip: Int!) {
    withdraws(
      where: { user: $user }
      orderBy: timestamp
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      user
      reserve {
        id
        symbol
        decimals
      }
      amount
      timestamp
      txHash
    }
  }
`;

const REPAYS_QUERY = `
  query GetRepays($user: String!, $first: Int!, $skip: Int!) {
    repays(
      where: { user: $user }
      orderBy: timestamp
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      user
      reserve {
        id
        symbol
        decimals
      }
      amount
      timestamp
      txHash
    }
  }
`;

/**
 * Récupère toutes les transactions d'un type donné avec pagination
 */
async function fetchTransactions(query, user, type) {
  const allTransactions = [];
  let skip = 0;
  const first = 1000; // Limite par requête
  
  try {
    while (true) {
      const variables = {
        user: user.toLowerCase(),
        first,
        skip
      };
      
      const data = await client.request(query, variables);
      const transactions = data[type] || [];
      
      if (transactions.length === 0) {
        break; // Plus de données
      }
      
      allTransactions.push(...transactions);
      
      if (transactions.length < first) {
        break; // Dernière page
      }
      
      skip += first;
    }
    
    console.log(`GraphQL: ${allTransactions.length} ${type} trouvés pour ${user}`);
    return allTransactions;
    
  } catch (error) {
    console.error(`Erreur GraphQL pour ${type}:`, error);
    throw new Error(`Erreur lors de la récupération des ${type}: ${error.message}`);
  }
}

/**
 * Récupère les emprunts d'une adresse
 */
async function fetchBorrows(user) {
  return fetchTransactions(BORROWS_QUERY, user, 'borrows');
}

/**
 * Récupère les dépôts d'une adresse
 */
async function fetchSupplies(user) {
  return fetchTransactions(SUPPLIES_QUERY, user, 'supplies');
}

/**
 * Récupère les retraits d'une adresse
 */
async function fetchWithdraws(user) {
  return fetchTransactions(WITHDRAWS_QUERY, user, 'withdraws');
}

/**
 * Récupère les remboursements d'une adresse
 */
async function fetchRepays(user) {
  return fetchTransactions(REPAYS_QUERY, user, 'repays');
}

/**
 * Récupère toutes les transactions d'une adresse en une seule fois
 */
async function fetchAllTransactions(user) {
  try {
    const [borrows, supplies, withdraws, repays] = await Promise.all([
      fetchBorrows(user),
      fetchSupplies(user),
      fetchWithdraws(user),
      fetchRepays(user)
    ]);
    
    return {
      borrows,
      supplies,
      withdraws,
      repays,
      total: borrows.length + supplies.length + withdraws.length + repays.length
    };
    
  } catch (error) {
    console.error('Erreur lors de la récupération de toutes les transactions:', error);
    throw error;
  }
}

module.exports = {
  fetchBorrows,
  fetchSupplies,
  fetchWithdraws,
  fetchRepays,
  fetchAllTransactions
}; 