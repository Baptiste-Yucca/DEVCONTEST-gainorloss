const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Chemin vers la base de données
const DB_PATH = path.join(__dirname, '../data/transactions.db');

// Créer le dossier data s'il n'existe pas
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Crée et initialise la base de données transactions.db
 */
function initializeTransactionsDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Erreur lors de l\'ouverture de la base de données transactions.db:', err);
        reject(err);
        return;
      }
      console.log('Base de données transactions.db connectée.');
    });

    // Créer la table des transactions utilisateur
    const createUserTransactionsTable = `
      CREATE TABLE IF NOT EXISTS user_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_address TEXT NOT NULL,
        transaction_hash TEXT NOT NULL,
        token_address TEXT NOT NULL,
        token_symbol TEXT NOT NULL,
        transaction_type TEXT NOT NULL,
        amount TEXT NOT NULL,
        amount_decimal REAL NOT NULL,
        from_address TEXT NOT NULL,
        to_address TEXT NOT NULL,
        block_number INTEGER NOT NULL,
        block_timestamp INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_address, transaction_hash, token_address)
      )
    `;

    // Créer la table des statuts de cache utilisateur
    const createUserCacheStatusTable = `
      CREATE TABLE IF NOT EXISTS user_cache_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_address TEXT UNIQUE NOT NULL,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        transaction_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Créer la table des transactions RMM (pour les données du subgraph)
    const createRmmTransactionsTable = `
      CREATE TABLE IF NOT EXISTS rmm_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_address TEXT NOT NULL,
        transaction_hash TEXT NOT NULL,
        transaction_type TEXT NOT NULL,
        token_symbol TEXT NOT NULL,
        amount TEXT NOT NULL,
        amount_decimal REAL NOT NULL,
        timestamp INTEGER NOT NULL,
        reserve TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_address, transaction_hash, transaction_type)
      )
    `;

    // Exécuter les créations de tables
    db.serialize(() => {
      // Créer la table user_transactions
      db.run(createUserTransactionsTable, (err) => {
        if (err) {
          console.error('Erreur lors de la création de la table user_transactions:', err);
          reject(err);
          return;
        }
        console.log('✅ Table user_transactions créée avec succès.');
      });

      // Créer la table user_cache_status
      db.run(createUserCacheStatusTable, (err) => {
        if (err) {
          console.error('Erreur lors de la création de la table user_cache_status:', err);
          reject(err);
          return;
        }
        console.log('✅ Table user_cache_status créée avec succès.');
      });

      // Créer la table rmm_transactions
      db.run(createRmmTransactionsTable, (err) => {
        if (err) {
          console.error('Erreur lors de la création de la table rmm_transactions:', err);
          reject(err);
          return;
        }
        console.log('✅ Table rmm_transactions créée avec succès.');
      });

      // Créer les index pour optimiser les performances
      const createIndexes = [
        'CREATE INDEX IF NOT EXISTS idx_user_transactions_address ON user_transactions(user_address);',
        'CREATE INDEX IF NOT EXISTS idx_user_transactions_hash ON user_transactions(transaction_hash);',
        'CREATE INDEX IF NOT EXISTS idx_user_transactions_token ON user_transactions(token_address);',
        'CREATE INDEX IF NOT EXISTS idx_user_transactions_timestamp ON user_transactions(block_timestamp);',
        'CREATE INDEX IF NOT EXISTS idx_rmm_transactions_address ON rmm_transactions(user_address);',
        'CREATE INDEX IF NOT EXISTS idx_rmm_transactions_hash ON rmm_transactions(transaction_hash);',
        'CREATE INDEX IF NOT EXISTS idx_rmm_transactions_type ON rmm_transactions(transaction_type);',
        'CREATE INDEX IF NOT EXISTS idx_rmm_transactions_timestamp ON rmm_transactions(timestamp);'
      ];

      createIndexes.forEach((indexSQL, index) => {
        db.run(indexSQL, (err) => {
          if (err) {
            console.error(`Erreur lors de la création de l'index ${index + 1}:`, err);
          } else {
            console.log(`✅ Index ${index + 1} créé avec succès.`);
          }
        });
      });

      // Fermer la base de données après avoir créé toutes les tables et index
      db.close((err) => {
        if (err) {
          console.error('Erreur lors de la fermeture de la base de données:', err);
          reject(err);
        } else {
          console.log('✅ Base de données transactions.db fermée.');
          resolve();
        }
      });
    });
  });
}

/**
 * Affiche les statistiques de la base de données
 */
function getDatabaseStats() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Erreur lors de l\'ouverture de la base de données:', err);
        reject(err);
        return;
      }
    });

    const queries = [
      'SELECT COUNT(*) as count FROM user_transactions',
      'SELECT COUNT(*) as count FROM user_cache_status',
      'SELECT COUNT(*) as count FROM rmm_transactions',
      'SELECT COUNT(DISTINCT user_address) as unique_users FROM user_transactions',
      'SELECT COUNT(DISTINCT user_address) as unique_users FROM rmm_transactions'
    ];

    const stats = {};

    queries.forEach((query, index) => {
      db.get(query, (err, row) => {
        if (err) {
          console.error(`Erreur lors de l'exécution de la requête ${index + 1}:`, err);
        } else {
          const key = Object.keys(row)[0];
          stats[key] = row[key];
        }

        // Si c'est la dernière requête, afficher les stats et fermer
        if (index === queries.length - 1) {
          console.log('\n📊 Statistiques de la base de données transactions.db:');
          console.log(`   • Transactions utilisateur: ${stats.count || 0}`);
          console.log(`   • Statuts de cache: ${stats.count || 0}`);
          console.log(`   • Transactions RMM: ${stats.count || 0}`);
          console.log(`   • Utilisateurs uniques (transactions): ${stats.unique_users || 0}`);
          console.log(`   • Utilisateurs uniques (RMM): ${stats.unique_users || 0}`);

          db.close((err) => {
            if (err) {
              console.error('Erreur lors de la fermeture de la base de données:', err);
              reject(err);
            } else {
              resolve(stats);
            }
          });
        }
      });
    });
  });
}

/**
 * Fonction principale
 */
async function main() {
  try {
    console.log('🚀 Initialisation de la base de données transactions.db...\n');
    
    // Initialiser la base de données
    await initializeTransactionsDatabase();
    
    console.log('\n✅ Base de données transactions.db initialisée avec succès !');
    
    // Afficher les statistiques
    await getDatabaseStats();
    
    console.log('\n🎉 Script terminé avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    process.exit(1);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  main();
}

module.exports = {
  initializeTransactionsDatabase,
  getDatabaseStats
}; 