const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Chemin vers la base de données
const DB_PATH = path.join(__dirname, '../../data/transactions.db');

// Configuration de l'expiration du cache (en heures)
const CACHE_EXPIRATION_HOURS = process.env.CACHE_EXPIRATION_HOURS || 12;
const CACHE_EXPIRATION_MS = CACHE_EXPIRATION_HOURS * 60 * 60 * 1000;

console.log(`⚙️  Configuration cache: expiration = ${CACHE_EXPIRATION_HOURS}h`);

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
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_address, tx_hash, type)
        );
        
        CREATE TABLE IF NOT EXISTS user_cache_status (
          user_address TEXT PRIMARY KEY,
          last_updated_timestamp INTEGER NOT NULL,
          transaction_count INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_user_address ON user_transactions(user_address);
        CREATE INDEX IF NOT EXISTS idx_tx_hash ON user_transactions(tx_hash);
        CREATE INDEX IF NOT EXISTS idx_timestamp ON user_transactions(timestamp);
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
 * Vérifie si le cache d'un utilisateur a expiré
 */
function isCacheExpired(lastUpdatedTimestamp) {
  const now = Date.now();
  const cacheAge = now - (lastUpdatedTimestamp * 1000);
  return cacheAge > CACHE_EXPIRATION_MS;
}

/**
 * Nettoie les caches expirés
 */
async function cleanupExpiredCache() {
  try {
    const db = await initDatabase();
    
    return new Promise((resolve, reject) => {
      const now = Date.now();
      const expirationTimestamp = Math.floor((now - CACHE_EXPIRATION_MS) / 1000);
      
      // Supprimer les statuts de cache expirés
      const deleteExpiredStatusSql = `
        DELETE FROM user_cache_status 
        WHERE last_updated_timestamp < ?
      `;
      
      db.run(deleteExpiredStatusSql, [expirationTimestamp], function(err) {
        if (err) {
          db.close();
          reject(err);
          return;
        }
        
        const expiredStatusCount = this.changes;
        
        // Supprimer les transactions des utilisateurs expirés
        const deleteExpiredTransactionsSql = `
          DELETE FROM user_transactions 
          WHERE user_address IN (
            SELECT user_address 
            FROM user_cache_status 
            WHERE last_updated_timestamp < ?
          )
        `;
        
        db.run(deleteExpiredTransactionsSql, [expirationTimestamp], function(err) {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
          const expiredTransactionsCount = this.changes;
          
          if (expiredStatusCount > 0 || expiredTransactionsCount > 0) {
            console.log(`🧹 Nettoyage cache: ${expiredStatusCount} utilisateurs, ${expiredTransactionsCount} transactions expirées`);
          }
          
          resolve({ expiredStatusCount, expiredTransactionsCount });
        });
      });
    });
    
  } catch (error) {
    console.error('Erreur lors du nettoyage du cache:', error);
    return { expiredStatusCount: 0, expiredTransactionsCount: 0 };
  }
}

/**
 * Vérifie si un utilisateur a des transactions en cache (non expirées)
 */
async function hasUserTransactions(userAddress) {
  try {
    const db = await initDatabase();
    
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT COUNT(*) as count, last_updated_timestamp
        FROM user_transactions ut
        JOIN user_cache_status ucs ON ut.user_address = ucs.user_address
        WHERE ut.user_address = ?
      `;
      
      db.get(sql, [userAddress.toLowerCase()], (err, row) => {
        db.close();
        if (err) {
          console.error('Erreur lors de la vérification du cache:', err);
          reject(err);
          return;
        }
        
        if (row.count > 0) {
          // Vérifier si le cache a expiré
          if (isCacheExpired(row.last_updated_timestamp)) {
            console.log(`⏰ Cache expiré pour ${userAddress} (${CACHE_EXPIRATION_HOURS}h)`);
            resolve(false);
          } else {
            resolve(true);
          }
        } else {
          resolve(false);
        }
      });
    });
    
  } catch (error) {
    console.error('Erreur lors de la vérification du cache:', error);
    return false;
  }
}

/**
 * Récupère le statut de cache d'un utilisateur
 */
async function getCacheStatus(userAddress) {
  try {
    const db = await initDatabase();
    
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT last_updated_timestamp, transaction_count
        FROM user_cache_status 
        WHERE user_address = ?
      `;
      
      db.get(sql, [userAddress.toLowerCase()], (err, row) => {
        db.close();
        if (err) {
          console.error('Erreur lors de la récupération du statut de cache:', err);
          reject(err);
          return;
        }
        
        if (row && !isCacheExpired(row.last_updated_timestamp)) {
          resolve(row);
        } else {
          resolve(null);
        }
      });
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération du statut de cache:', error);
    return null;
  }
}

/**
 * Met à jour le statut de cache d'un utilisateur
 */
async function updateCacheStatus(userAddress, lastUpdatedTimestamp, transactionCount) {
  try {
    const db = await initDatabase();
    
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO user_cache_status 
        (user_address, last_updated_timestamp, transaction_count, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `;
      
      db.run(sql, [userAddress.toLowerCase(), lastUpdatedTimestamp, transactionCount], function(err) {
        db.close();
        if (err) {
          console.error('Erreur lors de la mise à jour du statut de cache:', err);
          reject(err);
          return;
        }
        resolve(this.changes);
      });
    });
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut de cache:', error);
    throw error;
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
        let maxTimestamp = 0;
        
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
          maxTimestamp = Math.max(maxTimestamp, tx.timestamp);
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
          maxTimestamp = Math.max(maxTimestamp, tx.timestamp);
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
          maxTimestamp = Math.max(maxTimestamp, tx.timestamp);
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
          maxTimestamp = Math.max(maxTimestamp, tx.timestamp);
        });
        
        stmt.finalize((err) => {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
            return;
          }
          
          // Mettre à jour le statut de cache
          const totalCount = (transactions.borrows?.length || 0) + 
                           (transactions.supplies?.length || 0) + 
                           (transactions.withdraws?.length || 0) + 
                           (transactions.repays?.length || 0);
          
          db.run('UPDATE user_cache_status SET last_updated_timestamp = ?, transaction_count = ?, updated_at = CURRENT_TIMESTAMP WHERE user_address = ?', 
            [maxTimestamp, totalCount, userAddress.toLowerCase()], (err) => {
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
                console.log(`✅ ${totalInserted} transactions stockées pour ${userAddress} (max timestamp: ${maxTimestamp})`);
                resolve({ totalInserted, maxTimestamp });
              });
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
    // Nettoyer les caches expirés (une fois par requête)
    await cleanupExpiredCache();
    
    // Vérifier si l'utilisateur a des données en cache
    const hasCache = await hasUserTransactions(userAddress);
    
    if (req) {
      req.stopTimer('cache_check');
      req.logEvent('cache_check_completed', { 
        address: userAddress, 
        hasCache,
        expirationHours: CACHE_EXPIRATION_HOURS
      });
    }
    
    if (hasCache) {
      console.log(`📦 Récupération depuis le cache pour ${userAddress}`);
      
      // Récupérer les transactions en cache
      const cachedTransactions = await getUserTransactions(userAddress);
      
      // Vérifier s'il y a de nouvelles transactions
      const cacheStatus = await getCacheStatus(userAddress);
      if (cacheStatus) {
        console.log(`🔄 Vérification des nouvelles transactions depuis ${new Date(cacheStatus.last_updated_timestamp * 1000).toISOString()}`);
        
        // Utiliser la fonction GraphQL pour récupérer les nouvelles transactions
        const { fetchNewTransactions } = require('./graphql');
        const newTransactions = await fetchNewTransactions(userAddress, cacheStatus.last_updated_timestamp, req);
        
        if (newTransactions.total > 0) {
          console.log(`🆕 ${newTransactions.total} nouvelles transactions trouvées`);
          
          // Stocker seulement les nouvelles transactions
          await storeUserTransactions(userAddress, newTransactions);
          
          // Fusionner les transactions
          return mergeTransactions(cachedTransactions, newTransactions);
        } else {
          console.log(`✅ Aucune nouvelle transaction trouvée`);
          return cachedTransactions;
        }
      } else {
        return cachedTransactions;
      }
    } else {
      console.log(`🔄 Pas de cache, requête TheGraph complète pour ${userAddress}`);
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

/**
 * Fusionne les transactions en cache avec les nouvelles
 */
function mergeTransactions(cached, newTransactions) {
  return {
    borrows: [...(cached.borrows || []), ...(newTransactions.borrows || [])],
    supplies: [...(cached.supplies || []), ...(newTransactions.supplies || [])],
    withdraws: [...(cached.withdraws || []), ...(newTransactions.withdraws || [])],
    repays: [...(cached.repays || []), ...(newTransactions.repays || [])],
    tokenTransfers: newTransactions.tokenTransfers || { usdc: [], armmwxdai: [], others: [], total: 0 },
    total: (cached.borrows?.length || 0) + (cached.supplies?.length || 0) + 
           (cached.withdraws?.length || 0) + (cached.repays?.length || 0) +
           (newTransactions.borrows?.length || 0) + (newTransactions.supplies?.length || 0) +
           (newTransactions.withdraws?.length || 0) + (newTransactions.repays?.length || 0)
  };
}

module.exports = {
  createTables,
  hasUserTransactions,
  getUserTransactions,
  storeUserTransactions,
  getTransactionsWithCache,
  getCacheStatus,
  updateCacheStatus,
  cleanupExpiredCache,
  isCacheExpired
}; 