const fetch = require('node-fetch');

/**
 * Script de test pour vérifier le fonctionnement du timetracker
 */
async function testTimetracker() {
  const baseUrl = 'http://localhost:3001';
  
  console.log('🧪 Test du timetracker...\n');
  
  try {
    // Test 1: Endpoint de santé
    console.log('1️⃣ Test de l\'endpoint de santé...');
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Santé:', healthData.status);
    console.log('📊 Performance incluse:', !!healthData._performance);
    console.log('');
    
    // Test 2: Endpoint de performance
    console.log('2️⃣ Test de l\'endpoint de performance...');
    const perfResponse = await fetch(`${baseUrl}/api/health/performance`);
    const perfData = await perfResponse.json();
    console.log('✅ Performance récupérée');
    console.log('📊 Request ID:', perfData.requestId);
    console.log('⏱️  Temps total:', perfData.totalTime);
    console.log('📝 Nombre de logs:', perfData.summary?.totalLogs || 0);
    console.log('');
    
    // Test 3: Résumé de performance
    console.log('3️⃣ Test du résumé de performance...');
    const summaryResponse = await fetch(`${baseUrl}/api/health/performance/summary`);
    const summaryData = await summaryResponse.json();
    console.log('✅ Résumé récupéré');
    console.log('📊 Request ID:', summaryData.requestId);
    console.log('⏱️  Temps total:', summaryData.totalTime);
    console.log('🔧 Opérations:', Object.keys(summaryData.operations || {}).length);
    console.log('');
    
    // Test 4: Requête RMM avec tracking
    console.log('4️⃣ Test d\'une requête RMM avec tracking...');
    const testAddress = '0x3f3994bb23c48204ddeb99aa6bf6dd275abf7a3f';
    const rmmResponse = await fetch(`${baseUrl}/api/rmm/v3/${testAddress}`);
    const rmmData = await rmmResponse.json();
    
    if (rmmData._performance) {
      console.log('✅ Performance tracking activé');
      console.log('📊 Request ID:', rmmData._performance.requestId);
      console.log('⏱️  Temps total:', rmmData._performance.totalTime);
      console.log('📝 Nombre de logs:', rmmData._performance.logs.length);
      
      // Afficher les timers principaux
      const timers = rmmData._performance.logs.filter(log => log.action === 'stop_timer');
      console.log('⏱️  Timers détectés:');
      timers.forEach(timer => {
        console.log(`   - ${timer.name}: ${timer.duration}`);
      });
    } else {
      console.log('❌ Performance tracking non détecté');
    }
    console.log('');
    
    // Test 5: Vérifier les logs de performance après la requête RMM
    console.log('5️⃣ Vérification des logs de performance...');
    const perfAfterResponse = await fetch(`${baseUrl}/api/health/performance`);
    const perfAfterData = await perfAfterResponse.json();
    
    if (perfAfterData.timers && perfAfterData.timers.length > 0) {
      console.log('✅ Timers détectés:');
      perfAfterData.timers.forEach(timer => {
        console.log(`   - ${timer.name}: ${timer.avgTime} (${timer.count} fois)`);
      });
    } else {
      console.log('❌ Aucun timer détecté');
    }
    
    console.log('\n🎉 Tests terminés avec succès!');
    
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
  testTimetracker();
}

module.exports = { testTimetracker }; 