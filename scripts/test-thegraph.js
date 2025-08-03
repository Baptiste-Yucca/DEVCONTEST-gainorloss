#!/usr/bin/env node

const fetch = require('node-fetch');

// Configuration du subgraph
const SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/id/QmXT8Cpkjevu2sPN1fKkwb7Px9Wqj84DALA2TQ8nokhj7e';

// Queries GraphQL pour les différents types de transactions
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

// Fonction pour interroger le subgraph
async function querySubgraph(query, variables) {
  try {
    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
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

// Fonction pour tester une requête spécifique
async function testQuery(queryType, userAddress) {
  console.log(`🔍 Test de la requête ${queryType} pour l'adresse ${userAddress}`);
  console.log(`📡 URL: ${SUBGRAPH_URL}`);
  console.log(`📝 Query: ${QUERIES[queryType]}`);
  
  try {
    const variables = {
      user: userAddress.toLowerCase()
    };
    
    console.log(`🔧 Variables: ${JSON.stringify(variables, null, 2)}`);
    
    const data = await querySubgraph(QUERIES[queryType], variables);
    const transactions = data[queryType] || [];
    
    console.log(`✅ ${transactions.length} transactions trouvées`);
    
    if (transactions.length > 0) {
      console.log('\n📊 Exemple de la première transaction:');
      console.log(JSON.stringify(transactions[0], null, 2));
      
      if (transactions.length > 1) {
        console.log('\n📊 Exemple de la dernière transaction:');
        console.log(JSON.stringify(transactions[transactions.length - 1], null, 2));
      }
    }
    
    return { success: true, data, count: transactions.length };
    
  } catch (error) {
    console.error(`❌ Erreur lors de la requête ${queryType}:`, error.message);
    return { success: false, error: error.message };
  }
}

// Fonction pour tester toutes les requêtes
async function testAllQueries(userAddress) {
  console.log(`🚀 Test complet pour l'adresse: ${userAddress}`);
  console.log('=' .repeat(60));
  
  const results = {};
  
  for (const [queryType, query] of Object.entries(QUERIES)) {
    console.log(`\n📋 Test de ${queryType.toUpperCase()}:`);
    console.log('-'.repeat(40));
    
    const result = await testQuery(queryType, userAddress);
    results[queryType] = result;
    
    if (result.success) {
      console.log(`✅ ${queryType}: ${result.count} transactions`);
    } else {
      console.log(`❌ ${queryType}: ${result.error}`);
    }
  }
  
  console.log('\n📊 Résumé:');
  console.log('=' .repeat(60));
  
  let totalTransactions = 0;
  for (const [queryType, result] of Object.entries(results)) {
    if (result.success) {
      console.log(`${queryType}: ${result.count} transactions`);
      totalTransactions += result.count;
    } else {
      console.log(`${queryType}: ERREUR - ${result.error}`);
    }
  }
  
  console.log(`\n🎯 Total: ${totalTransactions} transactions`);
  
  return results;
}

// Fonction principale
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node test-thegraph.js <adresse> [type]');
    console.log('');
    console.log('Types disponibles:');
    console.log('  borrows - Emprunts');
    console.log('  repays - Remboursements');
    console.log('  deposits - Dépôts');
    console.log('  redeemUnderlyings - Retraits');
    console.log('  all - Tous les types (par défaut)');
    console.log('');
    console.log('Exemples:');
    console.log('  node test-thegraph.js 0xBfC71268725323DD06F32fbe81EC576195785Df5');
    console.log('  node test-thegraph.js 0xBfC71268725323DD06F32fbe81EC576195785Df5 borrows');
    console.log('  node test-thegraph.js 0xBfC71268725323DD06F32fbe81EC576195785Df5 all');
    return;
  }
  
  const userAddress = args[0];
  const queryType = args[1] || 'all';
  
  // Validation de l'adresse
  if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
    console.error('❌ Adresse invalide. Format attendu: 0x...');
    return;
  }
  
  if (queryType === 'all') {
    await testAllQueries(userAddress);
  } else if (QUERIES[queryType]) {
    await testQuery(queryType, userAddress);
  } else {
    console.error(`❌ Type de requête invalide: ${queryType}`);
    console.log('Types disponibles:', Object.keys(QUERIES).join(', '));
  }
}

if (require.main === module) {
  main().catch(console.error);
} 