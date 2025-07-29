const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Chemin vers la base de données
const DB_PATH = path.join(__dirname, '../../data/transactions.db');

/**
 * Initialise la connexion à la base de données
 */
function initDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Erreur lors de l\'ouverture de la base de données:', err);
        reject(err);
        return;
      }
      resolve(db);
    });
  });
}

/**
 * Crée les tables si elles n'existent pas
 */
async function createTables() {
  try {
    const db = await initDatabase();
    
    return new Promise((resolve, reject) => {
      const sql = `
        CREATE TABLE IF NOT EXISTS user_transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_address TEXT NOT NULL,
          tx_hash TEXT NOT NULL,
          amount TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          type TEXT NOT NULL,
          token TEXT NOT NULL,
          reserve_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_user_address ON user_transactions(user_address);
        CREATE INDEX IF NOT EXISTS idx_tx_hash ON user_transactions(tx_hash);
      `;
      
      db.exec(sql, (err) => {
        db.close();
        if (err) {
          console.error('Erreur lors de la création des tables:', err);
          reject(err);
          return;
        }
        console.log('✅ Tables de cache créées avec succès');
        resolve();
      });
    });
    
  } catch (error) {
    console.error('Erreur lors de la création des tables:', error);
    throw error;
  }
}

/**
 * Vérifie si un utilisateur a des transactions en cache
 */
async function hasUserTransactions(userAddress) {
  try {
    const db = await initDatabase();
    
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT COUNT(*) as count 
        FROM user_transactions 
        WHERE user_address = ?
      `;
      
      db.get(sql, [userAddress.toLowerCase()], (err, row) => {
        db.close();
        if (err) {
          console.error('Erreur lors de la vérification du cache:', err);
          reject(err);
          return;
        }
        resolve(row.count > 0);
      });
    });
    
  } catch (error) {
    console.error('Erreur lors de la vérification du cache:', error);
    return false;
  }
}

/**
 * Récupère les transactions d'un utilisateur depuis la DB
 */
async function getUserTransactions(userAddress) {
  try {
    const db = await initDatabase();
    
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT tx_hash, amount, timestamp, type, token, reserve_id
        FROM user_transactions 
        WHERE user_address = ?
        ORDER BY timestamp ASC
      `;
      
      db.all(sql, [userAddress.toLowerCase()], (err, rows) => {
        db.close();
        if (err) {
          console.error('Erreur lors de la récupération du cache:', err);
          reject(err);
          return;
        }
        
        // Grouper par type de transaction
        const transactions = {
          borrows: [],
          supplies: [],
          withdraws: [],
          repays: []
        };
        
        rows.forEach(row => {
          const transaction = {
            txHash: row.tx_hash,
            amount: row.amount,
            timestamp: row.timestamp,
            reserve: { id: row.reserve_id }
          };
          
          switch (row.type) {
            case 'borrow':
              transactions.borrows.push(transaction);
              break;
            case 'supply':
              transactions.supplies.push(transaction);
              break;
            case 'withdraw':
              transactions.withdraws.push(transaction);
              break;
            case 'repay':
              transactions.repays.push(transaction);
              break;
          }
        });
        
        resolve(transactions);
      });
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération du cache:', error);
    throw error;
  }
}

/**
 * Stocke les transactions d'un utilisateur dans la DB
 */
async function storeUserTransactions(userAddress, transactions) {
  try {
    const db = await initDatabase();
    
    return new Promise((resolve, reject) => {
      // Commencer une transaction
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        const insertSql = `
          INSERT OR IGNORE INTO user_transactions 
          (user_address, tx_hash, amount, timestamp, type, token, reserve_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        const stmt = db.prepare(insertSql);
        
        let totalInserted = 0;
        
        // Insérer les borrows
        transactions.borrows?.forEach(tx => {
          const token = identifyTokenFromReserveId(tx.reserve.id);
          stmt.run([
            userAddress.toLowerCase(),
            tx.txHash,
            tx.amount,
            tx.timestamp,
            'borrow',
            token,
            tx.reserve.id
          ]);
          totalInserted++;
        });
        
        // Insérer les supplies
        transactions.supplies?.forEach(tx => {
          const token = identifyTokenFromReserveId(tx.reserve.id);
          stmt.run([
            userAddress.toLowerCase(),
            tx.txHash,
            tx.amount,
            tx.timestamp,
            'supply',
            token,
            tx.reserve.id
          ]);
          totalInserted++;
        });
        
        // Insérer les withdraws
        transactions.withdraws?.forEach(tx => {
          const token = identifyTokenFromReserveId(tx.reserve.id);
          stmt.run([
            userAddress.toLowerCase(),
            tx.txHash,
            tx.amount,
            tx.timestamp,
            'withdraw',
            token,
            tx.reserve.id
          ]);
          totalInserted++;
        });
        
        // Insérer les repays
        transactions.repays?.forEach(tx => {
          const token = identifyTokenFromReserveId(tx.reserve.id);
          stmt.run([
            userAddress.toLowerCase(),
            tx.txHash,
            tx.amount,
            tx.timestamp,
            'repay',
            token,
            tx.reserve.id
          ]);
          totalInserted++;
        });
        
        stmt.finalize((err) => {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
            return;
          }
          
          db.run('COMMIT', (err) => {
            db.close();
            if (err) {
              reject(err);
              return;
            }
            console.log(`✅ ${totalInserted} transactions stockées pour ${userAddress}`);
            resolve(totalInserted);
          });
        });
      });
    });
    
  } catch (error) {
    console.error('Erreur lors du stockage en cache:', error);
    throw error;
  }
}

/**
 * Identifie le token basé sur le reserve.id
 */
function identifyTokenFromReserveId(reserveId) {
  // Import depuis les constantes centralisées
  const { TOKENS } = require('../../utils/constants.js');
  
  if (reserveId === TOKENS.USDC.reserveId) {
    return 'USDC';
  } else if (reserveId === TOKENS.WXDAI.reserveId) {
    return 'WXDAI';
  }
  return 'UNKNOWN';
}

/**
 * Récupère les transactions d'un utilisateur (cache ou TheGraph)
 */
async function getTransactionsWithCache(userAddress, req = null) {
  const timerName = req ? req.startTimer('cache_check') : null;
  
  try {
    // Vérifier si l'utilisateur a des données en cache
    const hasCache = await hasUserTransactions(userAddress);
    
    if (req) {
      req.stopTimer('cache_check');
      req.logEvent('cache_check_completed', { 
        address: userAddress, 
        hasCache 
      });
    }
    
    if (hasCache) {
      console.log(`📦 Récupération depuis le cache pour ${userAddress}`);
      return await getUserTransactions(userAddress);
    } else {
      console.log(`🔄 Pas de cache, requête TheGraph pour ${userAddress}`);
      // Utiliser la fonction GraphQL existante
      const { fetchAllTransactions } = require('./graphql');
      const transactions = await fetchAllTransactions(userAddress, req);
      
      // Stocker en cache pour la prochaine fois
      await storeUserTransactions(userAddress, transactions);
      
      return transactions;
    }
    
  } catch (error) {
    if (req) {
      req.stopTimer('cache_check');
      req.logEvent('cache_check_error', { 
        address: userAddress, 
        error: error.message 
      });
    }
    
    console.error('Erreur lors de la récupération avec cache:', error);
    throw error;
  }
}

module.exports = {
  createTables,
  hasUserTransactions,
  getUserTransactions,
  storeUserTransactions,
  getTransactionsWithCache
}; 