#!/usr/bin/env node

require('dotenv').config();
const { fetchTokenTransfersWithFallback, isMoralisAvailable } = require('../services/moralis');

/**
 * Test du service Moralis
 */
async function testMoralis() {
  console.log('🧪 Test du service Moralis');
  console.log('========================');
  
  // Test de disponibilité
  console.log(`\n📊 Statut Moralis:`);
  console.log(`- Clé API configurée: ${isMoralisAvailable() ? '✅ Oui' : '❌ Non'}`);
  console.log(`- Clé API: ${process.env.MORALIS_API_KEY ? 'Configurée' : 'Manquante'}`);
  
  if (!isMoralisAvailable()) {
    console.log('\n⚠️  Moralis non disponible, test avec GnosisScan uniquement...');
  }
  
  // Adresse de test (vous pouvez la changer)
  const testAddress = '0xbf64da3f8d6e827e17c98a7adbfd347c01500a5c';
  
  console.log(`\n🔍 Test avec l'adresse: ${testAddress}`);
  
  try {
    const startTime = Date.now();
    
    const result = await fetchTokenTransfersWithFallback(testAddress, []);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('\n📈 Résultats:');
    console.log(`- Temps de réponse: ${duration}ms`);
    console.log(`- Transferts USDC: ${result.usdc.length}`);
    console.log(`- Transferts WXDAI: ${result.armmwxdai.length}`);
    console.log(`- Autres transferts: ${result.others.length}`);
    console.log(`- Total: ${result.total}`);
    
    if (result.usdc.length > 0) {
      console.log('\n📋 Exemple de transfert USDC:');
      console.log(JSON.stringify(result.usdc[0], null, 2));
    }
    
    if (result.armmwxdai.length > 0) {
      console.log('\n📋 Exemple de transfert WXDAI:');
      console.log(JSON.stringify(result.armmwxdai[0], null, 2));
    }
    
    console.log('\n✅ Test terminé avec succès !');
    
  } catch (error) {
    console.error('\n❌ Erreur lors du test:', error.message);
    process.exit(1);
  }
}

// Exécuter le test
if (require.main === module) {
  testMoralis().catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });
}

module.exports = { testMoralis }; 