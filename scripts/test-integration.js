// Charger les variables d'environnement du backend
require('dotenv').config({ path: './backend/.env' });

const { getTransactions } = require('../backend/services/transaction-manager');

/**
 * Test de l'intégration transparente
 */
async function testIntegration() {
  try {
    console.log('🧪 Test de l\'intégration transparente...');
    
    // Vérifier que la clé API est disponible
    if (!process.env.GNOSISSCAN_API_KEY) {
      console.error('❌ Clé API Gnosis Scan non trouvée. Vérifiez le fichier backend/.env');
      process.exit(1);
    }
    
    console.log('✅ Clé API Gnosis Scan trouvée');
    
    // Test avec l'adresse problématique
    const walletAddress = '0xBfC71268725323DD06F32fbe81EC576195785Df5';
    
    console.log(`📊 Récupération des transactions pour ${walletAddress}`);
    
    const transactions = await getTransactions(walletAddress);
    
    console.log('\n📊 Résultats:');
    console.log(`- Total de transactions: ${transactions.total}`);
    console.log(`- Supplies: ${transactions.supplies?.length || 0}`);
    console.log(`- Withdraws: ${transactions.withdraws?.length || 0}`);
    console.log(`- Repays: ${transactions.repays?.length || 0}`);
    console.log(`- Borrows: ${transactions.borrows?.length || 0}`);
    
    if (transactions.supplies && transactions.supplies.length > 0) {
      console.log('\n🔍 Premières supplies:');
      transactions.supplies.slice(0, 3).forEach((tx, index) => {
        console.log(`\nSupply ${index + 1}:`);
        console.log(`  - Hash: ${tx.txHash || tx.id || 'N/A'}`);
        console.log(`  - Amount: ${tx.amount}`);
        console.log(`  - Timestamp: ${new Date(tx.timestamp * 1000).toISOString()}`);
        console.log(`  - Type: ${tx.type}`);
        console.log(`  - Move: ${tx.move || 'N/A'}`);
        console.log(`  - Reserve: ${tx.reserve.id}`);
      });
    }
    
    if (transactions.withdraws && transactions.withdraws.length > 0) {
      console.log('\n🔍 Premières withdraws:');
      transactions.withdraws.slice(0, 3).forEach((tx, index) => {
        console.log(`\nWithdraw ${index + 1}:`);
        console.log(`  - Hash: ${tx.txHash || tx.id || 'N/A'}`);
        console.log(`  - Amount: ${tx.amount}`);
        console.log(`  - Timestamp: ${new Date(tx.timestamp * 1000).toISOString()}`);
        console.log(`  - Type: ${tx.type}`);
        console.log(`  - Move: ${tx.move || 'N/A'}`);
        console.log(`  - Reserve: ${tx.reserve.id}`);
      });
    }
    
    console.log('\n✅ Test d\'intégration terminé avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur lors du test d\'intégration:', error);
    process.exit(1);
  }
}

// Exécution du script
if (require.main === module) {
  testIntegration();
}

module.exports = { testIntegration }; 