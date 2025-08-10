require('dotenv').config({ path: './backend/.env' });
const { GraphQLClient } = require('graphql-request');

// Configuration TheGraph RMMv3
const THEGRAPH_URL = 'https://api.thegraph.com/subgraphs/id/QmVH7ota6caVV2ceLY91KYYh6BJs2zeMScTTYgKDpt7VRg';
const API_KEY = process.env.THEGRAPH_API_KEY;

// Client GraphQL
const client = new GraphQLClient(THEGRAPH_URL, {
  headers: API_KEY ? {
    'Authorization': `Bearer ${API_KEY}`
  } : {}
});

// Query pour récupérer les balances des supply tokens (aToken)
const SUPPLY_TOKEN_BALANCE_QUERY = `
  query SupplyTokenBalances($user: String!) {
    atokenBalanceHistoryItems(
      where: { userReserve_: { user: $user } } 
      orderBy: timestamp
      orderDirection: desc
      first: 100
    ) {
      timestamp
      currentATokenBalance
      scaledATokenBalance
      index
      userReserve {
        reserve { 
          symbol 
          decimals 
        }
      }
    }
  }
`;

// Query pour récupérer les balances des debt tokens (vToken)
const DEBT_TOKEN_BALANCE_QUERY = `
  query DebtTokenBalances($user: String!) {
    vtokenBalanceHistoryItems(
      where: { userReserve_: { user: $user } }
      orderBy: timestamp
      orderDirection: desc
      first: 100
    ) {
      timestamp
      currentVariableDebt
      scaledVariableDebt
      index
      userReserve {
        reserve { 
          symbol 
          decimals 
        }
      }
    }
  }
`;

// Query combinée pour récupérer les deux types de balances
const COMBINED_BALANCE_QUERY = `
  query CombinedBalances($user: String!) {
    # Supply tokens (aToken)
    supplyBalances: atokenBalanceHistoryItems(
      where: { userReserve_: { user: $user } } 
      orderBy: timestamp
      orderDirection: desc
      first: 50
    ) {
      timestamp
      currentATokenBalance
      scaledATokenBalance
      index
      userReserve {
        reserve { 
          symbol 
          decimals 
        }
      }
    }
    
    # Debt tokens (vToken)
    debtBalances: vtokenBalanceHistoryItems(
      where: { userReserve_: { user: $user } }
      orderBy: timestamp
      orderDirection: desc
      first: 50
    ) {
      timestamp
      currentVariableDebt
      scaledVariableDebt
      index
      userReserve {
        reserve { 
          symbol 
          decimals 
        }
      }
    }
  }
`;

/**
 * Teste la récupération des balances des supply tokens
 */
async function testSupplyTokenBalances(userAddress) {
  try {
    console.log(`\n🔍 Test des balances des supply tokens pour ${userAddress}`);
    console.log('=' .repeat(60));
    
    const variables = { user: userAddress.toLowerCase() };
    const data = await client.request(SUPPLY_TOKEN_BALANCE_QUERY, variables);
    
    const supplyBalances = data.supplyBalances || [];
    console.log(`📊 ${supplyBalances.length} balances de supply tokens trouvées`);
    
    // Filtrer seulement USDC et WXDAI
    const filteredBalances = supplyBalances.filter(item => {
      const symbol = item.userReserve?.reserve?.symbol;
      return symbol === 'USDC' || symbol === 'WXDAI';
    });
    
    console.log(`✅ ${filteredBalances.length} balances filtrées (USDC/WXDAI)`);
    
    // Afficher les résultats
    filteredBalances.forEach((balance, index) => {
      const symbol = balance.userReserve.reserve.symbol;
      const decimals = balance.userReserve.reserve.decimals;
      const currentBalance = balance.currentATokenBalance;
      const scaledBalance = balance.scaledATokenBalance;
      const timestamp = new Date(balance.timestamp * 1000).toLocaleString();
      
      console.log(`\n${index + 1}. ${symbol} (${decimals} décimales)`);
      console.log(`   Timestamp: ${timestamp}`);
      console.log(`   Balance actuelle: ${currentBalance}`);
      console.log(`   Balance scaled: ${scaledBalance}`);
      console.log(`   Index: ${balance.index}`);
    });
    
    return filteredBalances;
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des supply token balances:', error);
    return [];
  }
}

/**
 * Teste la récupération des balances des debt tokens
 */
async function testDebtTokenBalances(userAddress) {
  try {
    console.log(`\n🔍 Test des balances des debt tokens pour ${userAddress}`);
    console.log('=' .repeat(60));
    
    const variables = { user: userAddress.toLowerCase() };
    const data = await client.request(DEBT_TOKEN_BALANCE_QUERY, variables);
    
    const debtBalances = data.debtBalances || [];
    console.log(`📊 ${debtBalances.length} balances de debt tokens trouvées`);
    
    // Filtrer seulement USDC et WXDAI
    const filteredBalances = debtBalances.filter(item => {
      const symbol = item.userReserve?.reserve?.symbol;
      return symbol === 'USDC' || symbol === 'WXDAI';
    });
    
    console.log(`✅ ${filteredBalances.length} balances filtrées (USDC/WXDAI)`);
    
    // Afficher les résultats
    filteredBalances.forEach((balance, index) => {
      const symbol = balance.userReserve.reserve.symbol;
      const decimals = balance.userReserve.reserve.decimals;
      const currentDebt = balance.currentVariableDebt;
      const scaledDebt = balance.scaledVariableDebt;
      const timestamp = new Date(balance.timestamp * 1000).toLocaleString();
      
      console.log(`\n${index + 1}. ${symbol} (${decimals} décimales)`);
      console.log(`   Timestamp: ${timestamp}`);
      console.log(`   Dette actuelle: ${currentDebt}`);
      console.log(`   Dette scaled: ${scaledDebt}`);
      console.log(`   Index: ${balance.index}`);
    });
    
    return filteredBalances;
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des debt token balances:', error);
    return [];
  }
}

/**
 * Formate un montant avec les bonnes décimales et virgules
 */
function formatAmount(amount, decimals, symbol) {
  try {
    // Convertir en nombre
    const numAmount = parseFloat(amount) / Math.pow(10, decimals);
    
    // Gérer les très petits montants
    if (numAmount < 0.01) {
      return '< 0.01$';
    }
    
    // Formater avec virgules pour les milliers
    const formatted = numAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    return `${formatted} $`;
  } catch (error) {
    return '0.00 $';
  }
}

/**
 * Formate une date au format YYYYMMDDHHmmss
 */
function formatDate(timestamp) {
  const date = new Date(timestamp * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * Génère le CSV des balances
 */
function generateCSV(supplyBalances, debtBalances) {
  console.log('\n📊 Génération du CSV des balances');
  console.log('=' .repeat(60));
  
  // En-tête CSV
  const csvHeader = 'date,amount,ticker,type,epochtime';
  console.log(csvHeader);
  
  let totalRows = 0;
  
  // Traiter les supply tokens
  supplyBalances.forEach(balance => {
    const symbol = balance.userReserve.reserve.symbol;
    const decimals = balance.userReserve.reserve.decimals;
    const currentBalance = balance.currentATokenBalance;
    const timestamp = balance.timestamp;
    
    // Formater les données
    const date = formatDate(timestamp);
    const amount = formatAmount(currentBalance, decimals, symbol);
    const ticker = symbol;
    const type = 'Supply';
    const epochtime = timestamp;
    
    // Afficher la ligne CSV
    const csvLine = `${date},${amount},${ticker},${type},${epochtime}`;
    console.log(csvLine);
    totalRows++;
  });
  
  // Traiter les debt tokens
  debtBalances.forEach(balance => {
    const symbol = balance.userReserve.reserve.symbol;
    const decimals = balance.userReserve.reserve.decimals;
    const currentDebt = balance.currentVariableDebt;
    const timestamp = balance.timestamp;
    
    // Formater les données
    const date = formatDate(timestamp);
    const amount = formatAmount(currentDebt, decimals, symbol);
    const ticker = symbol;
    const type = 'Debt';
    const epochtime = timestamp;
    
    // Afficher la ligne CSV
    const csvLine = `${date},${amount},${ticker},${type},${epochtime}`;
    console.log(csvLine);
    totalRows++;
  });
  
  console.log(`\n✅ CSV généré avec ${totalRows} lignes`);
  console.log('📋 Format: date,amount,ticker,type,epochtime');
  console.log('📅 Date: YYYYMMDDHHmmss');
  console.log('💰 Amount: formaté avec virgules (ex: 1,234.56 $)');
  console.log('🏷️  Ticker: USDC ou WXDAI');
  console.log('📊 Type: Supply ou Debt');
  console.log('⏰ Epochtime: timestamp Unix');
}

/**
 * Teste la query combinée pour récupérer les deux types de balances
 */
async function testCombinedBalances(userAddress) {
  try {
    console.log(`\n🔍 Test de la query combinée pour ${userAddress}`);
    console.log('=' .repeat(60));
    
    const variables = { user: userAddress.toLowerCase() };
    const data = await client.request(COMBINED_BALANCE_QUERY, variables);
    
    const supplyBalances = data.supplyBalances || [];
    const debtBalances = data.debtBalances || [];
    
    console.log(`📊 Supply tokens: ${supplyBalances.length}`);
    console.log(`📊 Debt tokens: ${debtBalances.length}`);
    
    // Filtrer et afficher les résultats
    const filteredSupply = supplyBalances.filter(item => {
      const symbol = item.userReserve?.reserve?.symbol;
      return symbol === 'USDC' || symbol === 'WXDAI';
    });
    
    const filteredDebt = debtBalances.filter(item => {
      const symbol = item.userReserve?.reserve?.symbol;
      return symbol === 'USDC' || symbol === 'WXDAI';
    });
    
    console.log(`\n✅ Supply tokens filtrés (USDC/WXDAI): ${filteredSupply.length}`);
    console.log(`✅ Debt tokens filtrés (USDC/WXDAI): ${filteredDebt.length}`);
    
    // Générer le CSV
    generateCSV(filteredSupply, filteredDebt);
    
    return {
      supply: filteredSupply,
      debt: filteredDebt
    };
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des balances combinées:', error);
    return { supply: [], debt: [] };
  }
}

/**
 * Fonction principale de test
 */
async function runTests() {
  // Adresse de test (remplacez par une vraie adresse si nécessaire)
  const testAddress = '0xBfC71268725323DD06F32fbe81EC576195785Df5';
  
  console.log('🚀 Test des queries TheGraph RMMv3');
  console.log('=' .repeat(60));
  console.log(`URL: ${THEGRAPH_URL}`);
  console.log(`API Key: ${API_KEY ? '✅ Configuré' : '❌ Non configuré'}`);
  console.log(`Adresse de test: ${testAddress}`);
  
  try {
    // Test 1: Supply token balances
    await testSupplyTokenBalances(testAddress);
    
    // Test 2: Debt token balances
    await testDebtTokenBalances(testAddress);
    
    // Test 3: Query combinée
    await testCombinedBalances(testAddress);
    
    console.log('\n🎉 Tous les tests sont terminés !');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution des tests:', error);
  }
}

// Exécuter les tests si le script est appelé directement
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testSupplyTokenBalances,
  testDebtTokenBalances,
  testCombinedBalances,
  SUPPLY_TOKEN_BALANCE_QUERY,
  DEBT_TOKEN_BALANCE_QUERY,
  COMBINED_BALANCE_QUERY
};
