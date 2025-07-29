#!/usr/bin/env node

require('dotenv').config();
const { fetchTokenTransfersWithFallback } = require('../services/moralis');

/**
 * Test de l'uniformité du format de réponse
 */
async function testFormatUniformity() {
  console.log('🧪 Test de l\'uniformité du format de réponse');
  console.log('============================================');
  
  // Adresse de test avec des transferts
  const testAddress = '0xbf64da3f8d6e827e17c98a7adbfd347c01500a5c';
  
  console.log(`\n🔍 Test avec l'adresse: ${testAddress}`);
  
  try {
    const result = await fetchTokenTransfersWithFallback(testAddress, []);
    
    console.log('\n📊 Résultats:');
    console.log(`- Transferts USDC: ${result.usdc.length}`);
    console.log(`- Transferts WXDAI: ${result.armmwxdai.length}`);
    console.log(`- Autres transferts: ${result.others.length}`);
    console.log(`- Total: ${result.total}`);
    
    // Vérifier le format des transferts USDC
    if (result.usdc.length > 0) {
      console.log('\n📋 Format des transferts USDC:');
      const sample = result.usdc[0];
      console.log('Propriétés attendues:');
      console.log('- timestamp: number');
      console.log('- hash: string');
      console.log('- from: string');
      console.log('- to: string');
      console.log('- value: string');
      console.log('- contractAddress: string');
      console.log('- functionName: string | null');
      console.log('- transfer: "in" | "out"');
      
      console.log('\n📄 Exemple réel:');
      console.log(JSON.stringify(sample, null, 2));
      
      // Vérifier que toutes les propriétés sont présentes
      const requiredProps = ['timestamp', 'hash', 'from', 'to', 'value', 'contractAddress', 'functionName', 'transfer'];
      const missingProps = requiredProps.filter(prop => !(prop in sample));
      
      if (missingProps.length > 0) {
        console.error(`❌ Propriétés manquantes: ${missingProps.join(', ')}`);
      } else {
        console.log('✅ Format USDC conforme');
      }
    }
    
    // Vérifier le format des transferts WXDAI
    if (result.armmwxdai.length > 0) {
      console.log('\n📋 Format des transferts WXDAI:');
      const sample = result.armmwxdai[0];
      console.log(JSON.stringify(sample, null, 2));
      
      // Vérifier que toutes les propriétés sont présentes
      const requiredProps = ['timestamp', 'hash', 'from', 'to', 'value', 'contractAddress', 'functionName', 'transfer'];
      const missingProps = requiredProps.filter(prop => !(prop in sample));
      
      if (missingProps.length > 0) {
        console.error(`❌ Propriétés manquantes: ${missingProps.join(', ')}`);
      } else {
        console.log('✅ Format WXDAI conforme');
      }
    }
    
    // Vérifier la cohérence entre USDC et WXDAI
    if (result.usdc.length > 0 && result.armmwxdai.length > 0) {
      const usdcSample = result.usdc[0];
      const wxdaiSample = result.armmwxdai[0];
      
      const usdcKeys = Object.keys(usdcSample).sort();
      const wxdaiKeys = Object.keys(wxdaiSample).sort();
      
      if (JSON.stringify(usdcKeys) === JSON.stringify(wxdaiKeys)) {
        console.log('✅ Cohérence entre USDC et WXDAI');
      } else {
        console.error('❌ Incohérence entre USDC et WXDAI');
        console.log('USDC keys:', usdcKeys);
        console.log('WXDAI keys:', wxdaiKeys);
      }
    }
    
    console.log('\n✅ Test d\'uniformité terminé !');
    
  } catch (error) {
    console.error('\n❌ Erreur lors du test:', error.message);
    process.exit(1);
  }
}

// Exécuter le test
if (require.main === module) {
  testFormatUniformity().catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });
}

module.exports = { testFormatUniformity }; 