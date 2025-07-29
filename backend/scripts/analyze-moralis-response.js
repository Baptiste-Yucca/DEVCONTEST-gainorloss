const { fetchMoralisTokenTransfers } = require('../services/moralis');

/**
 * Analyse la réponse de Moralis et implémente la logique de détermination des transferts
 */
async function analyzeMoralisResponse() {
  console.log('🔍 Analyse de la réponse Moralis');
  console.log('================================');
  
  // Adresse de test et token armmUSDC
  const testAddress = '0xbf64da3f8d6e827e17c98a7adbfd347c01500a5c';
  const armmUSDCAddress = '0xed56f76e9cbc6a64b821e9c016eafbd3db5436d1';
  
  console.log(`\n📋 Adresse de test: ${testAddress}`);
  console.log(`📋 Token armmUSDC: ${armmUSDCAddress}`);
  
  try {
    // Récupérer les données brutes de Moralis
    const moralisData = await fetchMoralisTokenTransfers(testAddress, armmUSDCAddress);
    
    console.log(`\n📊 ${moralisData.length} transferts récupérés de Moralis`);
    
    if (moralisData.length > 0) {
      console.log('\n📋 Structure d\'un transfert Moralis:');
      const sample = moralisData[0];
      console.log(JSON.stringify(sample, null, 2));
      
      console.log('\n🔍 Analyse des propriétés:');
      Object.entries(sample).forEach(([key, value]) => {
        console.log(`- ${key}: ${typeof value} = ${value}`);
      });
      
      // Analyser les transferts in/out
      console.log('\n📈 Analyse des transferts:');
      const incoming = moralisData.filter(tx => 
        tx.to_address.toLowerCase() === testAddress.toLowerCase()
      );
      const outgoing = moralisData.filter(tx => 
        tx.from_address.toLowerCase() === testAddress.toLowerCase()
      );
      
      console.log(`- Transferts entrants (to = ${testAddress}): ${incoming.length}`);
      console.log(`- Transferts sortants (from = ${testAddress}): ${outgoing.length}`);
      
      // Vérifier les doublons par hash
      const hashCounts = {};
      moralisData.forEach(tx => {
        const hash = tx.transaction_hash;
        hashCounts[hash] = (hashCounts[hash] || 0) + 1;
      });
      
      const duplicates = Object.entries(hashCounts).filter(([hash, count]) => count > 1);
      console.log(`\n🔍 Doublons détectés: ${duplicates.length}`);
      
      if (duplicates.length > 0) {
        console.log('📋 Hashes en double:');
        duplicates.forEach(([hash, count]) => {
          console.log(`- ${hash}: ${count} occurrences`);
        });
      }
      
      // Tester la transformation
      console.log('\n🔄 Test de transformation:');
      const transformed = moralisData.map(tx => {
        const isIncoming = tx.to_address.toLowerCase() === testAddress.toLowerCase();
        const transfer = isIncoming ? 'in' : 'out';
        
        return {
          timestamp: parseInt(tx.block_timestamp),
          hash: tx.transaction_hash,
          from: tx.from_address,
          to: tx.to_address,
          value: tx.value,
          contractAddress: tx.token_address,
          functionName: null,
          transfer
        };
      });
      
      console.log('\n📋 Exemple de transfert transformé:');
      console.log(JSON.stringify(transformed[0], null, 2));
      
      // Vérifier l'uniformité du format
      console.log('\n✅ Vérification du format uniforme:');
      const requiredProps = ['timestamp', 'hash', 'from', 'to', 'value', 'contractAddress', 'functionName', 'transfer'];
      const missingProps = requiredProps.filter(prop => !(prop in transformed[0]));
      
      if (missingProps.length > 0) {
        console.error(`❌ Propriétés manquantes: ${missingProps.join(', ')}`);
      } else {
        console.log('✅ Format uniforme correct');
      }
      
      // Statistiques finales
      console.log('\n📊 Statistiques finales:');
      console.log(`- Total transferts: ${moralisData.length}`);
      console.log(`- Transferts in: ${transformed.filter(tx => tx.transfer === 'in').length}`);
      console.log(`- Transferts out: ${transformed.filter(tx => tx.transfer === 'out').length}`);
      console.log(`- Hashes uniques: ${new Set(moralisData.map(tx => tx.transaction_hash)).size}`);
    }
    
    console.log('\n✅ Analyse terminée avec succès !');
    
  } catch (error) {
    console.error('\n❌ Erreur lors de l\'analyse:', error.message);
    process.exit(1);
  }
}

// Exécuter l'analyse
analyzeMoralisResponse(); 