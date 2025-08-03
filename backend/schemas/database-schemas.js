/**
 * Schémas de base de données centralisés
 * Ce fichier contient toutes les définitions de tables pour éviter la duplication
 * et assurer la cohérence entre les différents services
 */

// Schéma pour la table des transactions utilisateur
const USER_TRANSACTIONS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS user_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_address TEXT NOT NULL,
    tx_hash TEXT NOT NULL,
    amount TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    type TEXT NOT NULL,
    token TEXT NOT NULL,
    reserve_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_address, tx_hash, type)
  )
`;

// Index pour la table user_transactions
const USER_TRANSACTIONS_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_user_address ON user_transactions(user_address);',
  'CREATE INDEX IF NOT EXISTS idx_tx_hash ON user_transactions(tx_hash);',
  'CREATE INDEX IF NOT EXISTS idx_timestamp ON user_transactions(timestamp);'
];





// Schéma pour la table des taux d'intérêt
const INTEREST_RATES_SCHEMA = `
  CREATE TABLE IF NOT EXISTS interest_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL,
    reserve_id TEXT NOT NULL,
    date TEXT NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    day INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,
    liquidity_rate_avg REAL,
    variable_borrow_rate_avg REAL,
    utilization_rate_avg REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(token, date)
  )
`;

// Index pour la table interest_rates
const INTEREST_RATES_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_token_date ON interest_rates(token, date);'
];

// Schéma pour la table des top holders (si utilisée)
const TOP_HOLDERS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS top_holders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    address TEXT NOT NULL,
    balance TEXT NOT NULL,
    percentage REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(address)
  )
`;

// Fonction pour obtenir tous les schémas de tables
function getAllTableSchemas() {
  return {
    user_transactions: {
      schema: USER_TRANSACTIONS_SCHEMA,
      indexes: USER_TRANSACTIONS_INDEXES
    },


    interest_rates: {
      schema: INTEREST_RATES_SCHEMA,
      indexes: INTEREST_RATES_INDEXES
    },
    top_holders: {
      schema: TOP_HOLDERS_SCHEMA,
      indexes: []
    }
  };
}

// Fonction pour obtenir un schéma spécifique
function getTableSchema(tableName) {
  const schemas = getAllTableSchemas();
  return schemas[tableName] || null;
}

// Fonction pour créer toutes les tables d'une base de données
async function createAllTables(db) {
  const schemas = getAllTableSchemas();
  
  for (const [tableName, tableConfig] of Object.entries(schemas)) {
    try {
      // Créer la table
      await new Promise((resolve, reject) => {
        db.run(tableConfig.schema, (err) => {
          if (err) {
            console.error(`❌ Erreur lors de la création de la table ${tableName}:`, err);
            reject(err);
          } else {
            console.log(`✅ Table ${tableName} créée avec succès`);
            resolve();
          }
        });
      });
      
      // Créer les index
      for (const indexSQL of tableConfig.indexes) {
        await new Promise((resolve, reject) => {
          db.run(indexSQL, (err) => {
            if (err) {
              console.error(`❌ Erreur lors de la création de l'index pour ${tableName}:`, err);
              reject(err);
            } else {
              console.log(`✅ Index créé pour ${tableName}`);
              resolve();
            }
          });
        });
      }
      
    } catch (error) {
      console.error(`❌ Erreur lors de la création de la table ${tableName}:`, error);
      throw error;
    }
  }
}

module.exports = {
  USER_TRANSACTIONS_SCHEMA,
  INTEREST_RATES_SCHEMA,
  TOP_HOLDERS_SCHEMA,
  USER_TRANSACTIONS_INDEXES,
  INTEREST_RATES_INDEXES,
  getAllTableSchemas,
  getTableSchema,
  createAllTables
}; 