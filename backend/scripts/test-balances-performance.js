const fetch = require('node-fetch');

// Configuration
const TEST_ADDRESS = '0x3f3994bb23c48204ddeb99aa6bf6dd275abf7a3f';
const BASE_URL = 'http://localhost:3001/api/balances';

// Fonction pour tester une route
async function testRoute(route, description) {
  console.log(`\n🧪 Test: ${description}`);
  console.log(`📡 Route: ${route}`);
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}${route}`);
    const data = await response.json();
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ Succès: ${duration}ms`);
    console.log(`📊 Status: ${response.status}`);
    console.log(`📈 API Version: ${data.data?.api_version || 'N/A'}`);
    
    if (data.success) {
      const balances = data.data.balances;
      console.log(`💰 Balances:`);
      Object.entries(balances).forEach(([key, balance]) => {
        console.log(`  - ${key}: ${balance.formatted} ${balance.symbol}`);
      });
    }
    
    return { success: true, duration, data };
    
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`❌ Erreur: ${duration}ms`);
    console.log(`💥 ${error.message}`);
    
    return { success: false, duration, error: error.message };
  }
}

// Fonction principale
async function runPerformanceTests() {
  console.log('🚀 Test de performance des APIs balances');
  console.log('=====================================');
  
  const results = [];
  
  // Test RPC (multicall)
  const rpcResult = await testRoute(`/rpc/${TEST_ADDRESS}`, 'API RPC (Multicall)');
  results.push({ version: 'RPC', ...rpcResult });
  
  // Test V2
  const v2Result = await testRoute(`/v2/${TEST_ADDRESS}`, 'API V2 (Etherscan/GnosisScan)');
  results.push({ version: 'V2', ...v2Result });
  
  // Test V3
  const v3Result = await testRoute(`/v3/${TEST_ADDRESS}`, 'API V3 (Optimisée)');
  results.push({ version: 'V3', ...v3Result });
  
  // Résumé des performances
  console.log('\n📊 Résumé des performances:');
  console.log('==========================');
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.version}: ${result.duration}ms`);
  });
  
  // Recommandation
  const fastest = results
    .filter(r => r.success)
    .sort((a, b) => a.duration - b.duration)[0];
  
  if (fastest) {
    console.log(`\n🏆 Recommandation: Utiliser l'API ${fastest.version} (${fastest.duration}ms)`);
  }
}

// Lancer les tests
if (require.main === module) {
  runPerformanceTests().catch(console.error);
}

module.exports = { runPerformanceTests }; 