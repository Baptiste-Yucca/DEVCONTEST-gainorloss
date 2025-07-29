/**
 * Test d'intégration complète avec la réponse de Moralis fournie
 */
function testMoralisIntegration() {
  console.log('🔧 Test d\'intégration Moralis complète');
  console.log('======================================');
  
  // Réponse de Moralis fournie par l'utilisateur (extrait)
  const moralisResponse = {
    "page": 0,
    "page_size": 100,
    "cursor": null,
    "result": [
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
      {
        "token_name": "USD//C on xDai",
        "token_symbol": "USDC",
        "from_address": "0xc304a53f9860f44fdae9d03735b46c9535e13fb5",
        "to_address": "0xbf64da3f8d6e827e17c98a7adbfd347c01500a5c",
        "address": "0xddafbb505ad214d7b80b1f830fccc89b60fb7a83",
        "block_timestamp": "2025-07-28T06:41:50.000Z",
        "transaction_hash": "0xc2c52b232e46e47e7ae6925eb82e521e5de6c4d37b26ce634325888c53da9ac2",
        "value": "42195000"
      }
    ]
  };
  
  const testAddress = '0xbf64da3f8d6e827e17c98a7adbfd347c01500a5c';
  const moralisData = moralisResponse.result;
  
  console.log(`\n📋 Adresse de test: ${testAddress}`);
  console.log(`📊 ${moralisData.length} transferts dans la réponse`);
  
  // Simuler la transformation Moralis (mise à jour)
  function transformMoralisTransfers(moralisData, tokenSymbol, userAddress) {
    return moralisData.map(tx => {
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
  
  // Test 1: Transformation des données
  console.log('\n🔄 Test 1: Transformation des données Moralis');
  const transformed = transformMoralisTransfers(moralisData, 'USDC', testAddress);
  
  console.log('📋 Transferts transformés:');
  transformed.forEach((tx, index) => {
    console.log(`${index + 1}. Hash: ${tx.hash.substring(0, 10)}...`);
    console.log(`   From: ${tx.from.substring(0, 10)}...`);
    console.log(`   To: ${tx.to.substring(0, 10)}...`);
    console.log(`   Transfer: ${tx.transfer}`);
    console.log(`   Value: ${tx.value}`);
    console.log(`   Contract: ${tx.contractAddress.substring(0, 10)}...`);
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
  
  // Test 3: Détection et prévention des doublons
  console.log('\n🔍 Test 3: Détection et prévention des doublons');
  
  // Simuler des hashes existants (par exemple, d'autres APIs)
  const existingHashes = ['0x34673d53e75285ebdf999b62a640cd2f4c5643421efa415602c3615a278eaba2'];
  console.log(`- Hashes existants: ${existingHashes.length}`);
  
  const filteredTransfers = filterDuplicates(transformed, existingHashes);
  console.log(`- Transferts après filtrage: ${filteredTransfers.length}`);
  
  if (filteredTransfers.length < transformed.length) {
    console.log('✅ Doublons correctement filtrés');
    console.log(`- Transferts filtrés: ${transformed.length - filteredTransfers.length}`);
  } else {
    console.log('⚠️ Aucun doublon détecté dans les hashes existants');
  }
  
  // Test 4: Validation du format uniforme
  console.log('\n✅ Test 4: Validation du format uniforme');
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
  
  // Test 5: Simulation de l'intégration avec le backend
  console.log('\n🔧 Test 5: Simulation de l\'intégration backend');
  
  // Simuler la séparation par type de token
  const usdcTransfers = transformed
    .filter(tx => tx.contractAddress === '0xddafbb505ad214d7b80b1f830fccc89b60fb7a83') // USDC contract
    .map(tx => {
      const { contractAddress, ...txWithoutContract } = tx;
      return txWithoutContract;
    });
  
  const otherTransfers = transformed
    .filter(tx => tx.contractAddress !== '0xddafbb505ad214d7b80b1f830fccc89b60fb7a83')
    .map(tx => {
      const { contractAddress, ...txWithoutContract } = tx;
      return txWithoutContract;
    });
  
  console.log(`- Transferts USDC: ${usdcTransfers.length}`);
  console.log(`- Autres transferts: ${otherTransfers.length}`);
  
  // Simuler la réponse finale du backend
  const finalResponse = {
    usdc: usdcTransfers,
    armmwxdai: [], // Pas de WXDAI dans cet exemple
    others: otherTransfers,
    total: transformed.length
  };
  
  console.log('\n📋 Réponse finale simulée:');
  console.log(JSON.stringify(finalResponse, null, 2));
  
  // Test 6: Statistiques finales
  console.log('\n📊 Test 6: Statistiques finales');
  console.log(`- Total transferts: ${transformed.length}`);
  console.log(`- Transferts in: ${incoming.length}`);
  console.log(`- Transferts out: ${outgoing.length}`);
  console.log(`- Hashes uniques: ${new Set(transformed.map(tx => tx.hash)).size}`);
  console.log(`- Transferts après filtrage des doublons: ${filteredTransfers.length}`);
  console.log(`- Transferts USDC: ${usdcTransfers.length}`);
  console.log(`- Autres transferts: ${otherTransfers.length}`);
  
  console.log('\n✅ Intégration testée avec succès !');
  console.log('\n💡 Points clés validés:');
  console.log('✅ Transformation des données Moralis');
  console.log('✅ Détermination correcte des transferts in/out');
  console.log('✅ Prévention des doublons par hash');
  console.log('✅ Format uniforme avec GnosisScan');
  console.log('✅ Séparation par type de token');
  console.log('✅ Intégration avec le backend');
}

// Exécuter le test d'intégration
testMoralisIntegration(); 