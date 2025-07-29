#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Test de l'API Moralis avec curl
 */
async function testMoralisCurl() {
  console.log('🧪 Test de l\'API Moralis avec curl');
  console.log('====================================');
  
  // Configuration
  const testAddress = '0xbf64da3f8d6e827e17c98a7adbfd347c01500a5c';
  const armmUSDCAddress = '0xed56f76e9cbc6a64b821e9c016eafbd3db5436d1';
  
  console.log(`\n🔍 Test avec l'adresse: ${testAddress}`);
  console.log(`Token: armmUSDC (${armmUSDCAddress})`);
  
  // Construire la commande curl
  const url = `https://deep-index.moralis.io/api/v2/${testAddress}/erc20/transfers?chain=gnosis&token_addresses=${armmUSDCAddress}`;
  
  console.log(`\n🌐 URL: ${url}`);
  
  // Si une clé API est fournie, afficher la commande complète
  if (process.env.MORALIS_API_KEY && process.env.MORALIS_API_KEY !== 'your_moralis_api_key_here') {
    console.log('\n📋 Commande curl complète:');
    console.log(`curl -X GET "${url}" -H "X-API-Key: ${process.env.MORALIS_API_KEY}"`);
    
    console.log('\n🚀 Test avec la clé API configurée...');
    
    try {
      const startTime = Date.now();
      
      const { stdout, stderr } = await execAsync(`curl -s -X GET "${url}" -H "X-API-Key: ${process.env.MORALIS_API_KEY}"`);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`\n📈 Résultats (${duration}ms):`);
      
      if (stderr) {
        console.error('Erreur:', stderr);
      }
      
      try {
        const data = JSON.parse(stdout);
        console.log(`- Statut: ${data.status || 'N/A'}`);
        console.log(`- Transferts: ${data.result?.length || 0}`);
        
        if (data.result && data.result.length > 0) {
          console.log('\n📋 Premier transfert:');
          console.log(JSON.stringify(data.result[0], null, 2));
        }
        
        if (data.error) {
          console.error('\n❌ Erreur API:', data.error);
        }
        
      } catch (parseError) {
        console.log('\n📄 Réponse brute:');
        console.log(stdout.substring(0, 500) + '...');
      }
      
    } catch (error) {
      console.error('\n❌ Erreur lors du test:', error.message);
    }
    
  } else {
    console.log('\n💡 Pour tester avec une vraie clé API:');
    console.log('1. Créez un fichier .env.local');
    console.log('2. Ajoutez: MORALIS_API_KEY=votre_cle_api');
    console.log('3. Relancez ce script');
    console.log('\n4. Ou testez manuellement avec curl:');
    console.log(`curl -X GET "${url}" -H "X-API-Key: YOUR_API_KEY"`);
  }
}

// Exécuter le test
if (require.main === module) {
  testMoralisCurl().catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });
}

module.exports = { testMoralisCurl }; 