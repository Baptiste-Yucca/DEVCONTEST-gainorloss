const fetch = require('node-fetch');

/**
 * Script de test final pour valider le cache incrémental
 */
async function testFinalCache() {
  const baseUrl = 'http://localhost:3001';
  const testAddress = '0x7ca24D4443fF5298D9A1729622A116b712A58A56';
  
  console.log('🧪 Test final du cache incrémental...\n');
  console.log(`📋 Adresse de test: ${testAddress}\n`);
  
  try {
    // Test 1: Première requête (TheGraph)
    console.log('1️⃣ Première requête (TheGraph)...');
    const startTime1 = Date.now();
    
    const response1 = await fetch(`${baseUrl}/api/rmm/v3/${testAddress}`);
    const data1 = await response1.json();
    
    const time1 = Date.now() - startTime1;
    console.log(`⏱️  Temps: ${time1}ms`);
    
    if (data1._performance) {
      const graphqlEvents = data1._performance.logs.filter(log => 
        log.action === 'event' && log.event.includes('graphql')
      );
      
      console.log('📊 Événements GraphQL:');
      graphqlEvents.forEach(event => {
        console.log(`   - ${event.event}:`, event.details);
      });
    }
    console.log('');
    
    // Test 2: Deuxième requête (Cache)
    console.log('2️⃣ Deuxième requête (Cache)...');
    const startTime2 = Date.now();
    
    const response2 = await fetch(`${baseUrl}/api/rmm/v3/${testAddress}`);
    const data2 = await response2.json();
    
    const time2 = Date.now() - startTime2;
    console.log(`⏱️  Temps: ${time2}ms`);
    
    if (data2._performance) {
      const cacheEvents = data2._performance.logs.filter(log => 
        log.action === 'event' && log.event.includes('cache')
      );
      
      console.log('📊 Événements de cache:');
      cacheEvents.forEach(event => {
        console.log(`   - ${event.event}:`, event.details);
      });
    }
    console.log('');
    
    // Test 3: Troisième requête (Vérification incrémentale)
    console.log('3️⃣ Troisième requête (Vérification incrémentale)...');
    const startTime3 = Date.now();
    
    const response3 = await fetch(`${baseUrl}/api/rmm/v3/${testAddress}`);
    const data3 = await response3.json();
    
    const time3 = Date.now() - startTime3;
    console.log(`⏱️  Temps: ${time3}ms`);
    
    if (data3._performance) {
      const newEvents = data3._performance.logs.filter(log => 
        log.action === 'event' && log.event.includes('new_transactions')
      );
      
      console.log('📊 Événements de nouvelles transactions:');
      newEvents.forEach(event => {
        console.log(`   - ${event.event}:`, event.details);
      });
    }
    console.log('');
    
    // Calcul des améliorations
    const improvement = ((time1 - time2) / time1 * 100).toFixed(1);
    const speedup = (time1 / time2).toFixed(1);
    
    console.log('🎉 Résultats du test final:');
    console.log('================================');
    console.log(`📊 Première requête: ${time1}ms (TheGraph)`);
    console.log(`📊 Deuxième requête: ${time2}ms (Cache)`);
    console.log(`📊 Troisième requête: ${time3}ms (Vérification)`);
    console.log('');
    console.log(`🚀 Amélioration: ${improvement}%`);
    console.log(`⚡ Accélération: ${speedup}x plus rapide`);
    console.log('');
    
    if (time2 < time1 * 0.1) {
      console.log('✅ SUCCÈS: Le cache fonctionne parfaitement !');
    } else {
      console.log('⚠️  ATTENTION: Le cache pourrait ne pas fonctionner optimalement');
    }
    
    console.log('');
    console.log('🎯 Fonctionnement du système:');
    console.log('   1. Première requête → Récupération complète depuis TheGraph');
    console.log('   2. Stockage en cache SQLite avec timestamp');
    console.log('   3. Requêtes suivantes → Vérification des nouvelles transactions');
    console.log('   4. Nouvelles transactions → Ajout incrémental au cache');
    console.log('');
    console.log('💡 Avantages:');
    console.log('   - Réduction drastique des appels TheGraph');
    console.log('   - Mise à jour automatique des nouvelles transactions');
    console.log('   - Performance optimale pour les utilisateurs réguliers');
    
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
  testFinalCache();
}

module.exports = { testFinalCache }; 