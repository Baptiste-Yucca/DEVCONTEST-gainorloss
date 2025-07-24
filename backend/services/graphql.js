const { GraphQLClient } = require('graphql-request');
const { fetchTokenTransfers } = require('./gnosisscan');

// Configuration TheGraph
const THEGRAPH_URL = 'https://api.thegraph.com/subgraphs/id/QmVH7ota6caVV2ceLY91KYYh6BJs2zeMScTTYgKDpt7VRg';
const API_KEY = process.env.THEGRAPH_API_KEY;

// Client GraphQL
const client = new GraphQLClient(THEGRAPH_URL, {
  headers: API_KEY ? {
    'Authorization': `Bearer ${API_KEY}`
  } : {}
});

// Requêtes GraphQL
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

/**
 * Récupère les emprunts d'une adresse
 */
async function fetchBorrows(userAddress) {
  try {
    const variables = { userAddress: userAddress.toLowerCase() };
    const data = await client.request(BORROWS_QUERY, variables);
    console.log(`GraphQL: ${data.borrows?.length || 0} borrows trouvés pour ${userAddress}`);
    return data.borrows || [];
  } catch (error) {
    console.error(`Erreur GraphQL pour borrows:`, error);
    throw new Error(`Erreur lors de la récupération des borrows: ${error.message}`);
  }
}

/**
 * Récupère les dépôts d'une adresse
 */
async function fetchSupplies(userAddress) {
  try {
    const variables = { userAddress: userAddress.toLowerCase() };
    const data = await client.request(SUPPLIES_QUERY, variables);
    console.log(`GraphQL: ${data.supplies?.length || 0} supplies trouvés pour ${userAddress}`);
    return data.supplies || [];
  } catch (error) {
    console.error(`Erreur GraphQL pour supplies:`, error);
    throw new Error(`Erreur lors de la récupération des supplies: ${error.message}`);
  }
}

/**
 * Récupère les retraits d'une adresse
 */
async function fetchWithdraws(userAddress) {
  try {
    const variables = { userAddress: userAddress.toLowerCase() };
    const data = await client.request(WITHDRAWS_QUERY, variables);
    console.log(`GraphQL: ${data.redeemUnderlyings?.length || 0} withdraws trouvés pour ${userAddress}`);
    return data.redeemUnderlyings || [];
  } catch (error) {
    console.error(`Erreur GraphQL pour withdraws:`, error);
    throw new Error(`Erreur lors de la récupération des withdraws: ${error.message}`);
  }
}

/**
 * Récupère les remboursements d'une adresse
 */
async function fetchRepays(userAddress) {
  try {
    const variables = { userAddress: userAddress.toLowerCase() };
    const data = await client.request(REPAYS_QUERY, variables);
    console.log(`GraphQL: ${data.repays?.length || 0} repays trouvés pour ${userAddress}`);
    return data.repays || [];
  } catch (error) {
    console.error(`Erreur GraphQL pour repays:`, error);
    throw new Error(`Erreur lors de la récupération des repays: ${error.message}`);
  }
}

/**
 * Récupère toutes les transactions d'une adresse en une seule fois
 */
async function fetchAllTransactions(userAddress) {
  try {
    // Récupérer toutes les transactions via TheGraph
    const [borrows, supplies, withdraws, repays] = await Promise.all([
      fetchBorrows(userAddress),
      fetchSupplies(userAddress),
      fetchWithdraws(userAddress),
      fetchRepays(userAddress)
    ]);
    
    // Récupérer tous les hashes des transactions déjà obtenues
    const existingTxHashes = [
      ...borrows.map(tx => tx.txHash),
      ...supplies.map(tx => tx.txHash),
      ...withdraws.map(tx => tx.txHash),
      ...repays.map(tx => tx.txHash)
    ];
    
    console.log(`📊 ${existingTxHashes.length} transactions TheGraph récupérées`);
    
    // Récupérer les transferts de tokens via Gnosisscan (en excluant ceux déjà trouvés)
    const tokenTransfers = await fetchTokenTransfers(userAddress, existingTxHashes);
    
    return {
      borrows,
      supplies,
      withdraws,
      repays,
      tokenTransfers,
      total: borrows.length + supplies.length + withdraws.length + repays.length + tokenTransfers.total
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