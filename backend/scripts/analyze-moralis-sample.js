/**
 * Analyse la réponse de Moralis fournie par l'utilisateur
 */
function analyzeMoralisSample() {
  console.log('🔍 Analyse de la réponse Moralis (échantillon)');
  console.log('=============================================');
  
  // Réponse de Moralis fournie par l'utilisateur
  const moralisResponse = {
    "page": 0,
    "page_size": 100,
    "cursor": null,
    "result": [
      {
        "token_name": "USD//C on xDai",
        "token_symbol": "USDC",
        "token_logo": "https://logo.moralis.io/0x64_0xddafbb505ad214d7b80b1f830fccc89b60fb7a83_0eb1564208eef5b42ca7bc19cc5e6c4c.png",
        "token_decimals": "6",
        "from_address_entity": null,
        "from_address_entity_logo": null,
        "from_address": "0xf215af7efd2d90f7492a13c3147defd7f1b41a8e",
        "from_address_label": null,
        "to_address_entity": null,
        "to_address_entity_logo": null,
        "to_address": "0xbf64da3f8d6e827e17c98a7adbfd347c01500a5c",
        "to_address_label": null,
        "address": "0xddafbb505ad214d7b80b1f830fccc89b60fb7a83",
        "block_hash": "0xe13fe361b2ee97c93dbfcd84c734e8da3137bcf94a4109eb1e24ce390a6d6df2",
        "block_number": "41323672",
        "block_timestamp": "2025-07-28T21:26:00.000Z",
        "transaction_hash": "0x34673d53e75285ebdf999b62a640cd2f4c5643421efa415602c3615a278eaba2",
        "transaction_index": 0,
        "log_index": 246,
        "value": "102588",
        "possible_spam": false,
        "value_decimal": "0.102588",
        "verified_contract": true,
        "security_score": 74
      },
      {
        "token_name": "RealToken S 10422 Crocuslawn St Detroit MI",
        "token_symbol": "REALTOKEN-S-10422-CROCUSLAWN-ST-DETROIT-MI",
        "token_logo": null,
        "token_decimals": "18",
        "from_address_entity": null,
        "from_address_entity_logo": null,
        "from_address": "0xbf64da3f8d6e827e17c98a7adbfd347c01500a5c",
        "from_address_label": null,
        "to_address_entity": null,
        "to_address_entity_logo": null,
        "to_address": "0xc304a53f9860f44fdae9d03735b46c9535e13fb5",
        "to_address_label": null,
        "address": "0x13ae383d948ad3d6e2534463e54a9cca9eaa4145",
        "block_hash": "0x13cc9d14139b99cb30f6d14d6d97a5af93cf10702abfb05be309a791e5bb592b",
        "block_number": "41313456",
        "block_timestamp": "2025-07-28T06:41:50.000Z",
        "transaction_hash": "0xc2c52b232e46e47e7ae6925eb82e521e5de6c4d37b26ce634325888c53da9ac2",
        "transaction_index": 1,
        "log_index": 7,
        "value": "870000000000000000",
        "possible_spam": false,
        "value_decimal": "0.87",
        "verified_contract": false,
        "security_score": null
      }
    ]
  };
  
  const testAddress = '0xbf64da3f8d6e827e17c98a7adbfd347c01500a5c';
  const moralisData = moralisResponse.result;
  
  console.log(`\n📋 Adresse de test: ${testAddress}`);
  console.log(`📊 ${moralisData.length} transferts dans l'échantillon`);
  
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
        timestamp: parseInt(new Date(tx.block_timestamp).getTime() / 1000),
        hash: tx.transaction_hash,
        from: tx.from_address,
        to: tx.to_address,
        value: tx.value,
        contractAddress: tx.address, // C'est l'adresse du token
        functionName: null, // Moralis ne fournit pas le nom de fonction
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
    
    // Analyser les tokens
    console.log('\n🪙 Analyse des tokens:');
    const tokenSymbols = [...new Set(moralisData.map(tx => tx.token_symbol))];
    console.log(`- Tokens uniques: ${tokenSymbols.join(', ')}`);
    
    tokenSymbols.forEach(symbol => {
      const count = moralisData.filter(tx => tx.token_symbol === symbol).length;
      console.log(`  - ${symbol}: ${count} transferts`);
    });
  }
  
  console.log('\n✅ Analyse terminée avec succès !');
}

// Exécuter l'analyse
analyzeMoralisSample(); 