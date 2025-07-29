const fetch = require('node-fetch');

/**
 * Script de test pour comparer les performances GraphQL avant/après optimisation
 */
async function testGraphQLOptimization() {
  const baseUrl = 'http://localhost:3001';
  const testAddress = '0x3f3994bb23c48204ddeb99aa6bf6dd275abf7a3f';
  
  console.log('🧪 Test de l\'optimisation GraphQL...\n');
  
  try {
    // Test 1: Requête RMM avec tracking de performance
    console.log('1️⃣ Test de la requête RMM optimisée...');
    const startTime = Date.now();
    
    const rmmResponse = await fetch(`${baseUrl}/api/rmm/v3/${testAddress}`);
    const rmmData = await rmmResponse.json();
    
    const totalTime = Date.now() - startTime;
    
    if (rmmData._performance) {
      console.log('✅ Performance tracking activé');
      console.log('📊 Request ID:', rmmData._performance.requestId);
      console.log('⏱️  Temps total:', rmmData._performance.totalTime);
      
      // Analyser les timers GraphQL
      const graphqlTimers = rmmData._performance.logs.filter(log => 
        log.action === 'stop_timer' && log.name.includes('graphql')
      );
      
      console.log('📊 Timers GraphQL:');
      graphqlTimers.forEach(timer => {
        console.log(`   - ${timer.name}: ${timer.duration}`);
      });
      
      // Analyser les événements
      const graphqlEvents = rmmData._performance.logs.filter(log => 
        log.action === 'event' && log.event.includes('graphql')
      );
      
      console.log('📝 Événements GraphQL:');
      graphqlEvents.forEach(event => {
        console.log(`   - ${event.event}:`, event.details);
      });
      
    } else {
      console.log('❌ Performance tracking non détecté');
    }
    
    console.log(`⏱️  Temps total côté client: ${totalTime}ms`);
    console.log('');
    
    // Test 2: Vérifier les données retournées
    console.log('2️⃣ Vérification des données...');
    if (rmmData.success && rmmData.data?.results?.[0]?.data) {
      const result = rmmData.data.results[0].data;
      const transactions = result.transactions;
      
      console.log('✅ Données récupérées avec succès');
      console.log('📊 Transactions USDC:');
      console.log(`   - Borrows: ${transactions.USDC?.summary?.borrows || 0}`);
      console.log(`   - Supplies: ${transactions.USDC?.summary?.supplies || 0}`);
      console.log(`   - Withdraws: ${transactions.USDC?.summary?.withdraws || 0}`);
      console.log(`   - Repays: ${transactions.USDC?.summary?.repays || 0}`);
      
      console.log('📊 Transactions WXDAI:');
      console.log(`   - Borrows: ${transactions.WXDAI?.summary?.borrows || 0}`);
      console.log(`   - Supplies: ${transactions.WXDAI?.summary?.supplies || 0}`);
      console.log(`   - Withdraws: ${transactions.WXDAI?.summary?.withdraws || 0}`);
      console.log(`   - Repays: ${transactions.WXDAI?.summary?.repays || 0}`);
      
      // Vérifier la structure des données
      if (transactions.USDC?.debt?.[0]) {
        const sampleTransaction = transactions.USDC.debt[0];
        console.log('📋 Exemple de transaction:');
        console.log('   - Structure attendue:', {
          txHash: '0x...',
          amount: '2000000',
          timestamp: 1712583805,
          type: 'borrow'
        });
        console.log('   - Structure réelle:', {
          txHash: sampleTransaction.txHash,
          amount: sampleTransaction.amount,
          timestamp: sampleTransaction.timestamp,
          type: sampleTransaction.type
        });
      }
    } else {
      console.log('❌ Erreur dans les données retournées');
    }
    console.log('');
    
    // Test 3: Test de performance avec plusieurs adresses
    console.log('3️⃣ Test avec plusieurs adresses...');
    const testAddresses = [
      '0x3f3994bb23c48204ddeb99aa6bf6dd275abf7a3f',
      '0x1234567890123456789012345678901234567890' // Adresse de test
    ];
    
    const multiResponse = await fetch(`${baseUrl}/api/rmm/v3/${testAddresses.join('/')}`);
    const multiData = await multiResponse.json();
    
    if (multiData._performance) {
      console.log('✅ Test multi-adresses réussi');
      console.log('⏱️  Temps total:', multiData._performance.totalTime);
      
      const graphqlTimer = multiData._performance.logs.find(log => 
        log.action === 'stop_timer' && log.name.includes('graphql_all_transactions_optimized')
      );
      
      if (graphqlTimer) {
        console.log('📊 Timer GraphQL optimisé:', graphqlTimer.duration);
      }
    }
    console.log('');
    
    // Test 4: Comparaison avec l'endpoint de performance
    console.log('4️⃣ Détails de performance...');
    const perfResponse = await fetch(`${baseUrl}/api/health/performance`);
    const perfData = await perfResponse.json();
    
    if (perfData.timers && perfData.timers.length > 0) {
      console.log('📊 Détails des timers:');
      perfData.timers.forEach(timer => {
        console.log(`   - ${timer.name}: ${timer.avgTime} (${timer.count} fois)`);
      });
    }
    
    console.log('\n🎉 Tests d\'optimisation GraphQL terminés!');
    console.log('\n📈 Améliorations attendues:');
    console.log('   - Réduction de 4 requêtes GraphQL → 1 requête');
    console.log('   - Réduction des champs demandés (txHash, amount, timestamp, reserve.id)');
    console.log('   - Gain de performance estimé: 50-70%');
    
  } catch (error) {
    console.error('❌ Erreur lors des tests:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Assurez-vous que le serveur backend est démarré:');
      console.log('   npm start (dans le dossier backend)');
    }
  }
}

// Exécuter les tests si le script est appelé directement
if (require.main === module) {
  testGraphQLOptimization();
}

module.exports = { testGraphQLOptimization }; 