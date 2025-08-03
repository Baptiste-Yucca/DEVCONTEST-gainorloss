const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { getTableSchema, createAllTables } = require('../backend/schemas/database-schemas');

// Configuration des bases de données
const DATABASES = {
  rates: {
    path: path.join(__dirname, '../data/rates.db'),
    tables: ['interest_rates']
  },
  transactions: {
    path: path.join(__dirname, '../data/transactions.db'),
    tables: ['user_transactions']
  }
};

// Créer le dossier data s'il n'existe pas
function ensureDataDir() {
  const dataDir = path.dirname(DATABASES.rates.path);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

/**
 * Initialise une base de données spécifique
 */
function initializeDatabase(dbName) {
  const config = DATABASES[dbName];
  if (!config) {
    throw new Error(`Base de données inconnue: ${dbName}`);
  }

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(config.path, (err) => {
      if (err) {
        console.error(`Erreur lors de l'ouverture de ${dbName}:`, err);
        reject(err);
        return;
      }
      console.log(`✅ Base de données ${dbName} connectée`);
    });

    if (dbName === 'transactions') {
      // Utiliser createAllTables pour les transactions
      createAllTables(db).then(() => {
        db.close((err) => {
          if (err) {
            console.error('Erreur lors de la fermeture:', err);
            reject(err);
          } else {
            console.log(`✅ Base de données ${dbName} initialisée`);
            resolve();
          }
        });
      }).catch(reject);
    } else {
      // Utiliser getTableSchema pour les autres bases
      const tableConfig = getTableSchema(config.tables[0]);
      if (!tableConfig) {
        reject(new Error(`Schéma non trouvé pour ${config.tables[0]}`));
        return;
      }

      db.run(tableConfig.schema, (err) => {
        if (err) {
          console.error('Erreur lors de la création de la table:', err);
          db.close();
          reject(err);
          return;
        }
        console.log(`✅ Table ${config.tables[0]} créée`);

        // Créer les index
        tableConfig.indexes.forEach((indexSQL, i) => {
          db.run(indexSQL, (err) => {
            if (err) {
              console.error(`❌ Erreur index ${i + 1}:`, err);
            } else {
              console.log(`✅ Index ${i + 1} créé`);
            }
          });
        });

        db.close((err) => {
          if (err) {
            console.error('Erreur lors de la fermeture:', err);
            reject(err);
          } else {
            console.log(`✅ Base de données ${dbName} initialisée`);
            resolve();
          }
        });
      });
    }
  });
}

/**
 * Insère ou met à jour les taux dans la base de données
 */
function insertRates(token, reserveId, ratesData) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DATABASES.rates.path);
    
    const insertSQL = `
      INSERT OR REPLACE INTO interest_rates 
      (token, reserve_id, date, year, month, day, timestamp, 
       liquidity_rate_avg, variable_borrow_rate_avg, utilization_rate_avg)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const stmt = db.prepare(insertSQL);
    let insertedCount = 0;
    let errors = [];
    
    ratesData.forEach((rate) => {
      // Créer la clé de date au format YYYYMMDD (format humain)
      const year = rate.x.year;
      const monthHuman = String(rate.x.month + 1).padStart(2, '0'); // +1 pour format humain (1-12)
      const day = String(rate.x.date).padStart(2, '0');
      const dateKey = `${year}${monthHuman}${day}`;
      
      // Calculer le timestamp à partir de l'objet x (l'API ne fournit pas de timestamp)
      const dateObj = new Date(rate.x.year, rate.x.month, rate.x.date, rate.x.hours || 0);
      const timestamp = Math.floor(dateObj.getTime() / 1000);
      
      stmt.run([
        token,
        reserveId,
        dateKey,
        rate.x.year,
        rate.x.month + 1, // Convertir au format humain (1-12) pour cohérence
        rate.x.date,
        timestamp, // Utiliser le timestamp calculé
        rate.liquidityRate_avg,
        rate.variableBorrowRate_avg,
        rate.utilizationRate_avg
      ], function(err) {
        if (err) {
          errors.push(`Erreur pour ${dateKey}: ${err.message}`);
        } else {
          insertedCount++;
        }
      });
    });
    
    stmt.finalize((err) => {
      if (err) {
        console.error('Erreur lors de la finalisation du statement:', err);
        db.close();
        reject(err);
        return;
      }
      
      db.close((err) => {
        if (err) {
          console.error('Erreur lors de la fermeture de la base de données:', err);
          reject(err);
        } else {
          console.log(`${insertedCount} taux insérés/mis à jour pour ${token}`);
          if (errors.length > 0) {
            console.warn('Erreurs rencontrées:', errors);
          }
          resolve({ insertedCount, errors });
        }
      });
    });
  });
}

/**
 * Récupère les taux pour un token et une période donnée
 */
function getRates(token, fromDate, toDate = null) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DATABASES.rates.path);
    
    let sql = `
      SELECT * FROM interest_rates 
      WHERE token = ? AND date >= ?
    `;
    const params = [token, fromDate];
    
    if (toDate) {
      sql += ' AND date <= ?';
      params.push(toDate);
    }
    
    sql += ' ORDER BY date ASC';
    
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('Erreur lors de la récupération des taux:', err);
        db.close();
        reject(err);
        return;
      }
      
      db.close((err) => {
        if (err) {
          console.error('Erreur lors de la fermeture de la base de données:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  });
}

/**
 * Obtient la dernière date disponible pour un token
 */
function getLastDate(token) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DATABASES.rates.path);
    
    const sql = `
      SELECT MAX(date) as last_date 
      FROM interest_rates 
      WHERE token = ?
    `;
    
    db.get(sql, [token], (err, row) => {
      if (err) {
        console.error('Erreur lors de la récupération de la dernière date:', err);
        db.close();
        reject(err);
        return;
      }
      
      db.close((err) => {
        if (err) {
          console.error('Erreur lors de la fermeture de la base de données:', err);
          reject(err);
        } else {
          resolve(row ? row.last_date : null);
        }
      });
    });
  });
}

/**
 * Obtient la date la plus ancienne disponible pour un token
 */
function getOldestDate(token) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DATABASES.rates.path);
    
    const sql = `
      SELECT MIN(date) as oldest_date 
      FROM interest_rates 
      WHERE token = ?
    `;
    
    db.get(sql, [token], (err, row) => {
      if (err) {
        console.error('Erreur lors de la récupération de la date la plus ancienne:', err);
        db.close();
        reject(err);
        return;
      }
      
      db.close((err) => {
        if (err) {
          console.error('Erreur lors de la fermeture de la base de données:', err);
          reject(err);
        } else {
          resolve(row ? row.oldest_date : null);
        }
      });
    });
  });
}

/**
 * Obtient les statistiques de la base de données
 */
function getStats() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DATABASES.rates.path);
    
    const sql = `
      SELECT 
        token,
        COUNT(*) as count,
        MIN(date) as earliest_date,
        MAX(date) as latest_date
      FROM interest_rates 
      GROUP BY token
      ORDER BY token
    `;
    
    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error('Erreur lors de la récupération des statistiques:', err);
        db.close();
        reject(err);
        return;
      }
      
      db.close((err) => {
        if (err) {
          console.error('Erreur lors de la fermeture de la base de données:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  });
}

module.exports = {
  initializeDatabase,
  ensureDataDir,
  insertRates,
  getRates,
  getLastDate,
  getOldestDate,
  getStats,
  DATABASES
};

// Exécuter si le script est appelé directement
if (require.main === module) {
  ensureDataDir();
  
  const dbName = process.argv[2] || 'rates';
  console.log(`🚀 Initialisation de la base de données: ${dbName}`);
  
  initializeDatabase(dbName).then(() => {
    console.log(`✅ Base de données ${dbName} initialisée avec succès!`);
  }).catch((error) => {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    process.exit(1);
  });
} 