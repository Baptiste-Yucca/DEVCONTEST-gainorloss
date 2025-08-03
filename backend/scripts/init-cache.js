const { initializeDatabase, ensureDataDir } = require('../../scripts/database');

/**
 * Script d'initialisation de la base de données de transactions
 */
async function initTransactions() {
  console.log('🚀 Initialisation de la base de données de transactions...\n');
  
  try {
    ensureDataDir();
    
    // Initialiser la base transactions
    await initializeDatabase('transactions');
    
    console.log('✅ Base de données de transactions initialisée avec succès!');
    console.log('📁 Fichier créé: data/transactions.db');
    console.log('');
    console.log('📊 Structure de la base:');
    console.log('   - Table: user_transactions');
    console.log('   - Index: user_address, tx_hash, timestamp');
    console.log('');
    console.log('🎯 Fonctionnement:');
    console.log('   1. Première requête → TheGraph + stockage en DB');
    console.log('   2. Requêtes suivantes → Récupération depuis la DB');
    console.log('   3. Performance optimisée avec SQLite');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error.message);
    process.exit(1);
  }
}

// Exécuter si le script est appelé directement
if (require.main === module) {
  initTransactions();
}

module.exports = { initTransactions }; 