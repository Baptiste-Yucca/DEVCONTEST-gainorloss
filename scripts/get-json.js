#!/usr/bin/env node

const fetch = require('node-fetch');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/id/QmXT8Cpkjevu2sPN1fKkwb7Px9Wqj84DALA2TQ8nokhj7e';

// Queries GraphQL
const QUERIES = {
  borrows: `
    query GetBorrows($user: String!) {
      borrows(
        where: { user: $user }
        orderBy: timestamp
        orderDirection: asc
      ) {
        id
        amount
        reserve { 
          symbol 
        }
        timestamp
      }
    }
  `,
  repays: `
    query GetRepays($user: String!) {
      repays(
        where: { user: $user }
        orderBy: timestamp
        orderDirection: asc
      ) {
        id
        amount
        reserve { 
          symbol 
        }
        timestamp
      }
    }
  `,
  deposits: `
    query GetDeposits($user: String!) {
      deposits(
        where: { user: $user }
        orderBy: timestamp
        orderDirection: asc
      ) {
        id
        amount
        reserve { 
          symbol 
        }
        timestamp
      }
    }
  `,
  redeemUnderlyings: `
    query GetRedeemUnderlyings($user: String!) {
      redeemUnderlyings(
        where: { user: $user }
        orderBy: timestamp
        orderDirection: asc
      ) {
        id
        amount
        reserve { 
          symbol 
        }
        timestamp
      }
    }
  `
};

// Fonction pour appeler TheGraph directement
async function callTheGraph(queryType, userAddress) {
  try {
    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: QUERIES[queryType],
        variables: { user: userAddress.toLowerCase() }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }
    
    return data.data;
  } catch (error) {
    throw error;
  }
}

// Fonction pour appeler l'API backend
async function callBackendAPI(version, userAddress) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/rmm/${version}/${userAddress}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    throw error;
  }
}

// Fonction principale
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node get-json.js <source> <adresse> [type] [--print-query]');
    console.log('');
    console.log('Sources disponibles:');
    console.log('  thegraph <adresse> [type] - Appel direct TheGraph');
    console.log('  v2 <adresse> - API backend V2');
    console.log('  v3 <adresse> - API backend V3');
    console.log('');
    console.log('Types TheGraph disponibles:');
    console.log('  borrows, repays, deposits, redeemUnderlyings');
    console.log('');
    console.log('Options:');
    console.log('  --print-query - Afficher la requête GraphQL (pour thegraph)');
    console.log('');
    console.log('Exemples:');
    console.log('  node get-json.js thegraph 0xBfC71268725323DD06F32fbe81EC576195785Df5 borrows');
    console.log('  node get-json.js thegraph 0xBfC71268725323DD06F32fbe81EC576195785Df5 borrows --print-query');
    console.log('  node get-json.js v2 0xBfC71268725323DD06F32fbe81EC576195785Df5');
    console.log('  node get-json.js v3 0xBfC71268725323DD06F32fbe81EC576195785Df5');
    return;
  }
  
  const source = args[0];
  const userAddress = args[1];
  const queryType = args[2];
  const printQuery = args.includes('--print-query');
  
  // Validation de l'adresse
  if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
    console.error('❌ Adresse invalide. Format attendu: 0x...');
    process.exit(1);
  }
  
  try {
    let result;
    
    if (source === 'thegraph') {
      if (!queryType || !QUERIES[queryType]) {
        console.error(`❌ Type de requête invalide: ${queryType}`);
        console.log('Types disponibles:', Object.keys(QUERIES).join(', '));
        process.exit(1);
      }
      
      // Afficher la requête GraphQL si demandé
      if (printQuery) {
        console.log('📝 Requête GraphQL:');
        console.log('=' .repeat(60));
        console.log(QUERIES[queryType]);
        console.log('=' .repeat(60));
        console.log(`🔧 Variables: {"user": "${userAddress.toLowerCase()}"}`);
        console.log('=' .repeat(60));
        console.log(`🌐 URL: ${SUBGRAPH_URL}`);
        console.log('=' .repeat(60));
        return;
      }
      
      result = await callTheGraph(queryType, userAddress);
    } else if (source === 'v2' || source === 'v3') {
      result = await callBackendAPI(source, userAddress);
    } else {
      console.error(`❌ Source invalide: ${source}`);
      console.log('Sources disponibles: thegraph, v2, v3');
      process.exit(1);
    }
    
    // Afficher seulement le JSON brut pour jq
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
} 