#!/usr/bin/env node

require('dotenv').config();
const { fetchTokenTransfersWithFallback } = require('../services/moralis');

/**
 * Documente le format exact des transferts
 */
async function documentFormat() {
  console.log('📚 Documentation du format des transferts');
  console.log('=======================================');
  
  // Adresse de test
  const testAddress = '0xbf64da3f8d6e827e17c98a7adbfd347c01500a5c';
  
  console.log(`\n🔍 Test avec l'adresse: ${testAddress}`);
  
  try {
    const result = await fetchTokenTransfersWithFallback(testAddress, []);
    
    console.log('\n📊 Résultats:');
    console.log(`- Transferts USDC: ${result.usdc.length}`);
    console.log(`- Transferts WXDAI: ${result.armmwxdai.length}`);
    console.log(`- Autres transferts: ${result.others.length}`);
    
    // Documenter le format USDC
    if (result.usdc.length > 0) {
      console.log('\n📋 Format des transferts USDC:');
      const sample = result.usdc[0];
      
      console.log('```json');
      console.log(JSON.stringify(sample, null, 2));
      console.log('```');
      
      console.log('\n📝 Propriétés:');
      Object.entries(sample).forEach(([key, value]) => {
        const type = typeof value;
        console.log(`- ${key}: ${type}${value === null ? ' | null' : ''}`);
      });
    }
    
    // Documenter le format WXDAI
    if (result.armmwxdai.length > 0) {
      console.log('\n📋 Format des transferts WXDAI:');
      const sample = result.armmwxdai[0];
      
      console.log('```json');
      console.log(JSON.stringify(sample, null, 2));
      console.log('```');
      
      console.log('\n📝 Propriétés:');
      Object.entries(sample).forEach(([key, value]) => {
        const type = typeof value;
        console.log(`- ${key}: ${type}${value === null ? ' | null' : ''}`);
      });
    }
    
    // Vérifier la cohérence
    if (result.usdc.length > 0 && result.armmwxdai.length > 0) {
      const usdcSample = result.usdc[0];
      const wxdaiSample = result.armmwxdai[0];
      
      const usdcKeys = Object.keys(usdcSample).sort();
      const wxdaiKeys = Object.keys(wxdaiSample).sort();
      
      console.log('\n🔍 Vérification de cohérence:');
      console.log(`- Clés USDC: ${usdcKeys.join(', ')}`);
      console.log(`- Clés WXDAI: ${wxdaiKeys.join(', ')}`);
      
      if (JSON.stringify(usdcKeys) === JSON.stringify(wxdaiKeys)) {
        console.log('✅ Formats identiques');
      } else {
        console.log('❌ Formats différents');
      }
    }
    
    console.log('\n✅ Documentation terminée !');
    
  } catch (error) {
    console.error('\n❌ Erreur lors de la documentation:', error.message);
    process.exit(1);
  }
}

// Exécuter la documentation
if (require.main === module) {
  documentFormat().catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });
}

module.exports = { documentFormat }; 