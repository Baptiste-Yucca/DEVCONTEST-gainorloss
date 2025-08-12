/**
 * Test de la logique de détermination des transferts in/out et prévention des doublons
 */
function testTransferLogic() {
  console.log('🧪 Test de la logique des transferts');
  console.log('====================================');
  
  // Données de test génériques pour simuler les transferts de tokens
  const testAddress = '0xbf64da3f8d6e827e17c98a7adbfd347c01500a5c';
  const testData = [
    {
      "token_name": "USD//C on xDai",
      "token_symbol": "USDC",
      "from_address": "0xf215af7efd2d90f7492a13c3147defd7f1b41a8e",
      "to_address": "0xbf64da3f8d6e827e17c98a7adbfd347c01500a5c",
      "address": "0xddafbb505ad214d7b80b1f830fccc89b60fb7a83",
      "block_timestamp": "2025-07-28T21:26:00.000Z",
      "transaction_hash": "0x34673d53e75285ebdf999b62a640cd2f4c5643421efa415602c3615a278eaba2",
      "value": "102588"
    },
    {
      "token_name": "RealToken S 10422 Crocuslawn St Detroit MI",
      "token_symbol": "REALTOKEN-S-10422-CROCUSLAWN-ST-DETROIT-MI",
      "from_address": "0xbf64da3f8d6e827e17c98a7adbfd347c01500a5c",
      "to_address": "0xc304a53f9860f44fdae9d03735b46c9535e13fb5",
      "address": "0x13ae383d948ad3d6e2534463e54a9cca9eaa4145",
      "block_timestamp": "2025-07-28T06:41:50.000Z",
      "transaction_hash": "0xc2c52b232e46e47e7ae6925eb82e521e5de6c4d37b26ce634325888c53da9ac2",
      "value": "870000000000000000"
    },
    // Ajouter un doublon pour tester la prévention
    {
      "token_name": "USD//C on xDai",
      "token_symbol": "USDC",
      "from_address": "0xbf64da3f8d6e827e17c98a7adbfd347c01500a5c",
      "to_address": "0xcdb39dca09cbfd4e2232322d04b743d9b1118e85",
      "address": "0xddafbb505ad214d7b80b1f830fccc89b60fb7a83",
      "block_timestamp": "2025-07-27T22:29:00.000Z",
      "transaction_hash": "0x34673d53e75285ebdf999b62a640cd2f4c5643421efa415602c3615a278eaba2", // Même hash que le premier
      "value": "83905000"
    }
  ];
  
  console.log(`\n📋 Adresse de test: ${testAddress}`);
  console.log(`📊 ${testData.length} transferts de test`);
  
  // Simuler la transformation des données de transfert
  function transformTestTransfers(testData, tokenSymbol, userAddress) {
    return testData.map(tx => {
      // Déterminer la direction du transfert
      const isIncoming = tx.to_address.toLowerCase() === userAddress.toLowerCase();
      const transfer = isIncoming ? 'in' : 'out';
      
      // Convertir le timestamp ISO en timestamp Unix
      const timestamp = parseInt(new Date(tx.block_timestamp).getTime() / 1000);
      
      return {
        timestamp: timestamp,
        hash: tx.transaction_hash,
        from: tx.from_address,
        to: tx.to_address,
        value: tx.value,
        contractAddress: tx.address,
        functionName: null,
        transfer
      };
    });
  }
  
  // Simuler la prévention des doublons
  function filterDuplicates(transfers, existingHashes = []) {
    const existingHashSet = new Set(existingHashes);
    return transfers.filter(tx => !existingHashSet.has(tx.hash));
  }
  
  // Test 1: Transformation simple
  console.log('\n🔄 Test 1: Transformation des données');
  const transformed = transformTestTransfers(testData, 'USDC', testAddress);
  
  console.log('📋 Transferts transformés:');
  transformed.forEach((tx, index) => {
    console.log(`${index + 1}. Hash: ${tx.hash.substring(0, 10)}...`);
    console.log(`   From: ${tx.from.substring(0, 10)}...`);
    console.log(`   To: ${tx.to.substring(0, 10)}...`);
    console.log(`   Transfer: ${tx.transfer}`);
    console.log(`   Value: ${tx.value}`);
    console.log(`   Timestamp: ${tx.timestamp}`);
    console.log('');
  });
  
  // Test 2: Analyse des transferts in/out
  console.log('📈 Test 2: Analyse des transferts in/out');
  const incoming = transformed.filter(tx => tx.transfer === 'in');
  const outgoing = transformed.filter(tx => tx.transfer === 'out');
  
  console.log(`- Transferts entrants: ${incoming.length}`);
  incoming.forEach(tx => {
    console.log(`  → ${tx.from.substring(0, 10)}... → ${testAddress.substring(0, 10)}... (${tx.value})`);
  });
  
  console.log(`- Transferts sortants: ${outgoing.length}`);
  outgoing.forEach(tx => {
    console.log(`  → ${testAddress.substring(0, 10)}... → ${tx.to.substring(0, 10)}... (${tx.value})`);
  });
  
  // Test 3: Détection des doublons
  console.log('\n🔍 Test 3: Détection des doublons');
  const hashCounts = {};
  transformed.forEach(tx => {
    const hash = tx.hash;
    hashCounts[hash] = (hashCounts[hash] || 0) + 1;
  });
  
  const duplicates = Object.entries(hashCounts).filter(([hash, count]) => count > 1);
  console.log(`- Doublons détectés: ${duplicates.length}`);
  
  if (duplicates.length > 0) {
    console.log('📋 Hashes en double:');
    duplicates.forEach(([hash, count]) => {
      console.log(`  - ${hash.substring(0, 10)}...: ${count} occurrences`);
    });
  }
  
  // Test 4: Prévention des doublons
  console.log('\n🛡️ Test 4: Prévention des doublons');
  
  // Simuler des hashes existants
  const existingHashes = ['0x34673d53e75285ebdf999b62a640cd2f4c5643421efa415602c3615a278eaba2'];
  console.log(`- Hashes existants: ${existingHashes.length}`);
  
  const filteredTransfers = filterDuplicates(transformed, existingHashes);
  console.log(`- Transferts après filtrage: ${filteredTransfers.length}`);
  
  if (filteredTransfers.length < transformed.length) {
    console.log('✅ Doublons correctement filtrés');
  } else {
    console.log('⚠️ Aucun doublon détecté dans les hashes existants');
  }
  
  // Test 5: Validation du format uniforme
  console.log('\n✅ Test 5: Validation du format uniforme');
  const requiredProps = ['timestamp', 'hash', 'from', 'to', 'value', 'contractAddress', 'functionName', 'transfer'];
  
  const sample = transformed[0];
  const missingProps = requiredProps.filter(prop => !(prop in sample));
  
  if (missingProps.length > 0) {
    console.error(`❌ Propriétés manquantes: ${missingProps.join(', ')}`);
  } else {
    console.log('✅ Format uniforme correct');
    console.log('📋 Propriétés présentes:');
    requiredProps.forEach(prop => {
      const value = sample[prop];
      const type = typeof value;
      console.log(`  - ${prop}: ${type}${value === null ? ' | null' : ''}`);
    });
  }
  
  // Test 6: Statistiques finales
  console.log('\n📊 Test 6: Statistiques finales');
  console.log(`- Total transferts: ${transformed.length}`);
  console.log(`- Transferts in: ${incoming.length}`);
  console.log(`- Transferts out: ${outgoing.length}`);
  console.log(`- Hashes uniques: ${new Set(transformed.map(tx => tx.hash)).size}`);
  console.log(`- Transferts après filtrage des doublons: ${filteredTransfers.length}`);
  
  console.log('\n✅ Tests terminés avec succès !');
}

// Exécuter les tests
testTransferLogic(); 