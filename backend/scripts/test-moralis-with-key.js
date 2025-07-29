#!/usr/bin/env node

require('dotenv').config();
const { fetchMoralisTokenTransfers, isMoralisAvailable } = require('../services/moralis');

/**
 * Test direct de l'API Moralis avec une clé
 */
async function testMoralisWithKey() {
  console.log('🧪 Test direct de l\'API Moralis');
  console.log('================================');
  
  // Vérifier la clé API
  if (!process.env.MORALIS_API_KEY || process.env.MORALIS_API_KEY === 'your_moralis_api_key_here') {
    console.log('\n❌ Clé API Moralis non configurée');
    console.log('Pour tester avec une vraie clé:');
    console.log('1. Créez un fichier .env.local');
    console.log('2. Ajoutez: MORALIS_API_KEY=votre_cle_api');
    console.log('3. Relancez ce script');
    return;
  }
  
  console.log(`\n📊 Statut Moralis:`);
  console.log(`- Clé API configurée: ${isMoralisAvailable() ? '✅ Oui' : '❌ Non'}`);
  
  // Adresse de test
  const testAddress = '0xbf64da3f8d6e827e17c98a7adbfd347c01500a5c';
  const armmUSDCAddress = '0xed56f76e9cbc6a64b821e9c016eafbd3db5436d1';
  
  console.log(`\n🔍 Test avec l'adresse: ${testAddress}`);
  console.log(`Token: armmUSDC (${armmUSDCAddress})`);
  
  try {
    const startTime = Date.now();
    
    const result = await fetchMoralisTokenTransfers(testAddress, armmUSDCAddress);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('\n📈 Résultats:');
    console.log(`- Temps de réponse: ${duration}ms`);
    console.log(`- Transferts récupérés: ${result.length}`);
    
    if (result.length > 0) {
      console.log('\n📋 Exemple de transfert:');
      console.log(JSON.stringify(result[0], null, 2));
      
      console.log('\n📊 Statistiques:');
      const incoming = result.filter(tx => tx.to_address.toLowerCase() === testAddress.toLowerCase()).length;
      const outgoing = result.filter(tx => tx.from_address.toLowerCase() === testAddress.toLowerCase()).length;
      console.log(`- Transferts entrants: ${incoming}`);
      console.log(`- Transferts sortants: ${outgoing}`);
    }
    
    console.log('\n✅ Test terminé avec succès !');
    
  } catch (error) {
    console.error('\n❌ Erreur lors du test:', error.message);
    
    if (error.message.includes('401')) {
      console.log('\n💡 Erreur 401: Clé API invalide ou expirée');
    } else if (error.message.includes('429')) {
      console.log('\n💡 Erreur 429: Limite de requêtes dépassée');
    } else if (error.message.includes('404')) {
      console.log('\n💡 Erreur 404: Adresse ou token non trouvé');
    }
    
    process.exit(1);
  }
}

// Exécuter le test
if (require.main === module) {
  testMoralisWithKey().catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });
}

module.exports = { testMoralisWithKey }; 