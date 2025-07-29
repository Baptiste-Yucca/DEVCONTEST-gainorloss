const fetch = require('node-fetch');

/**
 * Script de test pour vérifier l'expiration automatique du cache
 */
async function testCacheExpiration() {
  const baseUrl = 'http://localhost:3001';
  const testAddress = '0x7ca24D4443fF5298D9A1729622A116b712A58A56';
  
  console.log('🧪 Test de l\'expiration automatique du cache...\n');
  console.log(`📋 Adresse de test: ${testAddress}\n`);
  
  try {
    // Test 1: Première requête (création du cache)
    console.log('1️⃣ Première requête (création du cache)...');
    const startTime1 = Date.now();
    
    const response1 = await fetch(`${baseUrl}/api/rmm/v3/${testAddress}`);
    const data1 = await response1.json();
    
    const time1 = Date.now() - startTime1;
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
    
    // Test 2: Deuxième requête (cache valide)
    console.log('2️⃣ Deuxième requête (cache valide)...');
    const startTime2 = Date.now();
    
    const response2 = await fetch(`${baseUrl}/api/rmm/v3/${testAddress}`);
    const data2 = await response2.json();
    
    const time2 = Date.now() - startTime2;
    console.log(`⏱️  Temps: ${time2}ms`);
    
    if (data2._performance) {
      const cacheEvents2 = data2._performance.logs.filter(log => 
        log.action === 'event' && log.event.includes('cache')
      );
      
      console.log('📊 Événements de cache:');
      cacheEvents2.forEach(event => {
        console.log(`   - ${event.event}:`, event.details);
      });
    }
    console.log('');
    
    // Test 3: Simulation d'expiration (si possible)
    console.log('3️⃣ Test de configuration d\'expiration...');
    
    // Vérifier la configuration actuelle
    const configResponse = await fetch(`${baseUrl}/api/health`);
    const configData = await configResponse.json();
    
    if (configData.cache) {
      console.log('📊 Configuration du cache:');
      console.log(`   - Expiration: ${configData.cache.expirationHours}h`);
      console.log(`   - Expiration MS: ${configData.cache.expirationMs}ms`);
    }
    console.log('');
    
    // Test 4: Vérification des logs de nettoyage
    console.log('4️⃣ Vérification des logs de nettoyage...');
    
    // Faire une requête pour déclencher le nettoyage
    const cleanupResponse = await fetch(`${baseUrl}/api/rmm/v3/${testAddress}`);
    const cleanupData = await cleanupResponse.json();
    
    if (cleanupData._performance) {
      const cleanupEvents = cleanupData._performance.logs.filter(log => 
        log.action === 'event' && log.event.includes('cleanup')
      );
      
      console.log('📊 Événements de nettoyage:');
      cleanupEvents.forEach(event => {
        console.log(`   - ${event.event}:`, event.details);
      });
    }
    console.log('');
    
    // Résumé
    console.log('🎉 Test d\'expiration terminé!');
    console.log('================================');
    console.log(`📊 Première requête: ${time1}ms`);
    console.log(`📊 Deuxième requête: ${time2}ms`);
    console.log('');
    console.log('🎯 Fonctionnement de l\'expiration:');
    console.log('   1. Cache créé avec timestamp');
    console.log('   2. Vérification automatique à chaque requête');
    console.log('   3. Nettoyage des données expirées');
    console.log('   4. Rechargement depuis TheGraph si nécessaire');
    console.log('');
    console.log('💡 Configuration:');
    console.log(`   - Variable d'environnement: CACHE_EXPIRATION_HOURS`);
    console.log(`   - Valeur par défaut: 12h`);
    console.log(`   - Modifiable sans redémarrage`);
    
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
  testCacheExpiration();
}

module.exports = { testCacheExpiration }; 