// Charger les variables d'environnement du backend
require('dotenv').config({ path: './backend/.env' });

const { testSupplyTokenTransactions } = require('../utils/api/gnosisscan/supplyTransactions.js');

/**
 * Script de test pour la récupération des transactions supply tokens
 */
async function main() {
  try {
    console.log('🧪 Démarrage du test des transactions supply tokens...');
    
    // Vérifier que la clé API est disponible
    if (!process.env.GNOSISSCAN_API_KEY) {
      console.error('❌ Clé API Gnosis Scan non trouvée. Vérifiez le fichier backend/.env');
      process.exit(1);
    }
    
    console.log('✅ Clé API Gnosis Scan trouvée');
    
    // Test avec l'exemple fourni
    const transactions = await testSupplyTokenTransactions();
    
    console.log('\n📊 Résultats détaillés:');
    console.log(`- Nombre total de transactions: ${transactions.length}`);
    
    if (transactions.length > 0) {
      console.log('\n🔍 Analyse des premières transactions:');
      transactions.slice(0, 5).forEach((tx, index) => {
        console.log(`\nTransaction ${index + 1}:`);
        console.log(`  - Hash: ${tx.hash}`);
        console.log(`  - Block: ${tx.blockNumber}`);
        console.log(`  - Timestamp: ${new Date(parseInt(tx.timestamp) * 1000).toISOString()}`);
        console.log(`  - Amount: ${tx.amount}`);
        console.log(`  - Move Type: ${tx.moveType}`);
        console.log(`  - Function: ${tx.functionName}`);
      });
      
      // Statistiques
      const moveInCount = transactions.filter(tx => tx.moveType === 'move_in').length;
      const moveOutCount = transactions.filter(tx => tx.moveType === 'move_out').length;
      
      console.log('\n📈 Statistiques:');
      console.log(`- Move In: ${moveInCount}`);
      console.log(`- Move Out: ${moveOutCount}`);
      
      // Analyse des fonctions
      const functionStats = {};
      transactions.forEach(tx => {
        functionStats[tx.functionName] = (functionStats[tx.functionName] || 0) + 1;
      });
      
      console.log('\n🔧 Fonctions utilisées:');
      Object.entries(functionStats).forEach(([func, count]) => {
        console.log(`  - ${func}: ${count} fois`);
      });
    }
    
    console.log('\n✅ Test terminé avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    process.exit(1);
  }
}

// Exécution du script
if (require.main === module) {
  main();
}

module.exports = { main }; 