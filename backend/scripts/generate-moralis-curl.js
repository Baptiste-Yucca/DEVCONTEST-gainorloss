/**
 * Génère la commande curl exacte pour tester l'API Moralis
 */
function generateMoralisCurl() {
  console.log('🔗 Génération de la commande curl Moralis');
  console.log('========================================');
  
  // Configuration
  const userAddress = '0xbf64da3f8d6e827e17c98a7adbfd347c01500a5c';
  const tokenAddress = '0xed56f76e9cbc6a64b821e9c016eafbd3db5436d1'; // armmUSDC
  const moralisApiKey = process.env.MORALIS_API_KEY;
  
  console.log(`\n📋 Adresse utilisateur: ${userAddress}`);
  console.log(`📋 Token armmUSDC: ${tokenAddress}`);
  
  // Construire l'URL
  const baseUrl = 'https://deep-index.moralis.io/api/v2';
  const url = `${baseUrl}/${userAddress}/erc20/transfers?chain=gnosis&token_addresses=${tokenAddress}`;
  
  console.log(`\n🔗 URL de l'API: ${url}`);
  
  if (moralisApiKey) {
    console.log('\n✅ Clé API Moralis trouvée');
    console.log('\n📋 Commande curl complète:');
    console.log('```bash');
    console.log(`curl -X GET "${url}" \\`);
    console.log(`  -H "X-API-Key: ${moralisApiKey}" \\`);
    console.log(`  -H "Accept: application/json"`);
    console.log('```');
    
    console.log('\n📋 Commande curl en une ligne:');
    console.log('```bash');
    console.log(`curl -X GET "${url}" -H "X-API-Key: ${moralisApiKey}" -H "Accept: application/json"`);
    console.log('```');
    
    console.log('\n💡 Pour tester directement:');
    console.log('```bash');
    console.log(`curl -X GET "${url}" -H "X-API-Key: ${moralisApiKey}" -H "Accept: application/json" | jq '.'`);
    console.log('```');
    
  } else {
    console.log('\n⚠️ Clé API Moralis non trouvée');
    console.log('\n📋 Commande curl (remplacez YOUR_API_KEY):');
    console.log('```bash');
    console.log(`curl -X GET "${url}" \\`);
    console.log(`  -H "X-API-Key: YOUR_API_KEY" \\`);
    console.log(`  -H "Accept: application/json"`);
    console.log('```');
    
    console.log('\n📋 Commande curl en une ligne:');
    console.log('```bash');
    console.log(`curl -X GET "${url}" -H "X-API-Key: YOUR_API_KEY" -H "Accept: application/json"`);
    console.log('```');
    
    console.log('\n💡 Pour configurer la clé API:');
    console.log('1. Créez un fichier .env.local dans le dossier backend');
    console.log('2. Ajoutez: MORALIS_API_KEY=votre_cle_api_ici');
    console.log('3. Relancez ce script');
  }
  
  console.log('\n📊 Informations sur la requête:');
  console.log(`- Méthode: GET`);
  console.log(`- Endpoint: /api/v2/{address}/erc20/transfers`);
  console.log(`- Chaîne: gnosis`);
  console.log(`- Token: ${tokenAddress}`);
  console.log(`- Utilisateur: ${userAddress}`);
  
  console.log('\n🔍 Paramètres de la requête:');
  console.log(`- chain: gnosis`);
  console.log(`- token_addresses: ${tokenAddress}`);
  
  console.log('\n📋 Headers requis:');
  console.log(`- X-API-Key: Votre clé API Moralis`);
  console.log(`- Accept: application/json`);
  
  console.log('\n✅ Génération terminée !');
}

// Exécuter la génération
generateMoralisCurl(); 