const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Chemin vers la base de données
const DB_PATH = path.join(__dirname, '../data/rates.db');

// Créer le dossier data s'il n'existe pas
const fs = require('fs');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Crée et initialise la base de données
 */
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Erreur lors de l\'ouverture de la base de données:', err);
        reject(err);
        return;
      }
      console.log('Base de données SQLite connectée.');
    });

    // Créer la table des taux
    const createTableSQL = `
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

    db.run(createTableSQL, (err) => {
      if (err) {
        console.error('Erreur lors de la création de la table:', err);
        db.close();
        reject(err);
        return;
      }
      console.log('Table interest_rates créée avec succès.');
      
      // Créer un index pour optimiser les requêtes
      const createIndexSQL = `
        CREATE INDEX IF NOT EXISTS idx_token_date ON interest_rates(token, date);
      `;
      
      db.run(createIndexSQL, (err) => {
        if (err) {
          console.error('Erreur lors de la création de l\'index:', err);
        } else {
          console.log('Index créé avec succès.');
        }
        
        db.close((err) => {
          if (err) {
            console.error('Erreur lors de la fermeture de la base de données:', err);
            reject(err);
          } else {
            console.log('Base de données fermée.');
            resolve();
          }
        });
      });
    });
  });
}

/**
 * Insère ou met à jour les taux dans la base de données
 */
function insertRates(token, reserveId, ratesData) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH);
    
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
    const db = new sqlite3.Database(DB_PATH);
    
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
    const db = new sqlite3.Database(DB_PATH);
    
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
    const db = new sqlite3.Database(DB_PATH);
    
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
    const db = new sqlite3.Database(DB_PATH);
    
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
  insertRates,
  getRates,
  getLastDate,
  getOldestDate,
  getStats,
  DB_PATH
}; 