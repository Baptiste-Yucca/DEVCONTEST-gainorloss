const fetch = require('node-fetch');

/**
 * Script de test pour vérifier le fonctionnement du cache incrémental
 */
async function testIncrementalCache() {
  const baseUrl = 'http://localhost:3001';
  const testAddress = '0x3f3994bb23c48204ddeb99aa6bf6dd275abf7a3f';
  
  console.log('🧪 Test du cache incrémental...\n');
  
  try {
    // Test 1: Requête avec cache existant
    console.log('1️⃣ Test avec cache existant...');
    const startTime = Date.now();
    
    const response1 = await fetch(`${baseUrl}/api/rmm/v3/${testAddress}`);
    const data1 = await response1.json();
    
    const time1 = Date.now() - startTime;
    console.log(`⏱️  Temps: ${time1}ms`);
    
    if (data1._performance) {
      const cacheEvents = data1._performance.logs.filter(log => 
        log.action === 'event' && log.event.includes('cache')
      );
      
      console.log('📊 Événements de cache:');
      cacheEvents.forEach(event => {
        console.log(`   - ${event.event}:`, event.details);
      });
    }
    console.log('');
    
    // Test 2: Requête avec nouvelle adresse
    console.log('2️⃣ Test avec nouvelle adresse...');
    const newAddress = '0x1234567890123456789012345678901234567890';
    const startTime2 = Date.now();
    
    const response2 = await fetch(`${baseUrl}/api/rmm/v3/${newAddress}`);
    const data2 = await response2.json();
    
    const time2 = Date.now() - startTime2;
    console.log(`⏱️  Temps: ${time2}ms`);
    
    if (data2._performance) {
      const graphqlEvents = data2._performance.logs.filter(log => 
        log.action === 'event' && log.event.includes('graphql')
      );
      
      console.log('📊 Événements GraphQL:');
      graphqlEvents.forEach(event => {
        console.log(`   - ${event.event}:`, event.details);
      });
    }
    console.log('');
    
    // Test 3: Deuxième requête pour la nouvelle adresse
    console.log('3️⃣ Test deuxième requête pour nouvelle adresse...');
    const startTime3 = Date.now();
    
    const response3 = await fetch(`${baseUrl}/api/rmm/v3/${newAddress}`);
    const data3 = await response3.json();
    
    const time3 = Date.now() - startTime3;
    console.log(`⏱️  Temps: ${time3}ms`);
    
    if (data3._performance) {
      const cacheEvents2 = data3._performance.logs.filter(log => 
        log.action === 'event' && log.event.includes('cache')
      );
      
      console.log('📊 Événements de cache (2ème requête):');
      cacheEvents2.forEach(event => {
        console.log(`   - ${event.event}:`, event.details);
      });
    }
    console.log('');
    
    // Test 4: Vérification des logs détaillés
    console.log('4️⃣ Analyse des timers...');
    const perfResponse = await fetch(`${baseUrl}/api/health/performance`);
    const perfData = await perfResponse.json();
    
    if (perfData.timers && perfData.timers.length > 0) {
      console.log('📊 Timers détectés:');
      perfData.timers.forEach(timer => {
        console.log(`   - ${timer.name}: ${timer.avgTime} (${timer.count} fois)`);
      });
    }
    
    console.log('\n🎉 Tests du cache incrémental terminés!');
    console.log('\n📈 Résultats attendus:');
    console.log('   - Cache existant: ~10-20ms');
    console.log('   - Nouvelle adresse: ~1300ms (TheGraph)');
    console.log('   - 2ème requête: ~10-20ms (cache)');
    
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
  testIncrementalCache();
}

module.exports = { testIncrementalCache }; 