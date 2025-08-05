const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Chemin vers la base de données
const DB_PATH = path.join(__dirname, '../../data/transactions.db');

console.log(`⚙️  Configuration: stockage permanent en SQLite`);

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
    const { createAllTables } = require('./schemas/database-schemas');
    
    await createAllTables(db);
    
    db.close((err) => {
      if (err) {
        console.error('Erreur lors de la fermeture de la base de données:', err);
        throw err;
      }
              console.log('✅ Tables de transactions créées avec succès');
    });
    
  } catch (error) {
    console.error('Erreur lors de la création des tables:', error);
    throw error;
  }
}

/**
 * Vérifie si un utilisateur a des transactions en base
 */
async function hasUserTransactions(userAddress) {
  try {
    const db = await initDatabase();
    
    return new Promise((resolve, reject) => {
      const sql = `SELECT COUNT(*) as count FROM user_transactions WHERE user_address = ?`;
      
      const normalizedAddress = userAddress.toLowerCase();
      console.log(`🔍 Vérification transactions pour: ${normalizedAddress}`);
      
      db.get(sql, [normalizedAddress], (err, row) => {
        db.close();
        if (err) {
          console.error('Erreur lors de la vérification des transactions:', err);
          reject(err);
          return;
        }
        
        const hasTransactions = row && row.count > 0;
        console.log(`📊 Transactions trouvées: ${row?.count || 0}`);
        
        if (hasTransactions) {
          console.log(`✅ Transactions existantes pour ${normalizedAddress}`);
        } else {
          console.log(`❌ Aucune transaction pour ${normalizedAddress}`);
        }
        
        resolve(hasTransactions);
      });
    });
    
  } catch (error) {
    console.error('Erreur lors de la vérification des transactions:', error);
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
          console.error('Erreur lors de la récupération des transactions:', err);
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
            console.error('Erreur lors de la récupération des transactions:', error);
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
          
          db.run('COMMIT', (err) => {
            db.close();
            if (err) {
              reject(err);
              return;
            }
            console.log(`✅ ${totalInserted} transactions stockées pour ${userAddress.toLowerCase()} (max timestamp: ${maxTimestamp})`);
            resolve({ totalInserted, maxTimestamp });
          });
        });
      });
    });
    
  } catch (error) {
            console.error('Erreur lors du stockage des transactions:', error);
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
 * Récupère les transactions d'un utilisateur en combinant debt tokens (TheGraph) et supply tokens (GnosisScan)
 */
async function getTransactions(userAddress, req = null) {
  const timerName = req ? req.startTimer('db_check') : null;
  
  // Normaliser l'adresse en minuscules pour la cohérence
  const normalizedAddress = userAddress.toLowerCase();
  
  try {
    // Vérifier si l'utilisateur a des données en base
    const hasTransactions = await hasUserTransactions(normalizedAddress);
    
    if (req) {
      req.stopTimer('db_check');
      req.logEvent('db_check_completed', { 
        address: normalizedAddress, 
        hasTransactions
      });
    }
    
    let finalTransactions = {
      borrows: [],
      supplies: [],
      withdraws: [],
      repays: [],
      tokenTransfers: { usdc: [], armmwxdai: [], others: [], total: 0 },
      total: 0
    };
    
    if (hasTransactions) {
      console.log(`📦 Récupération depuis la base pour ${normalizedAddress}`);
      const dbTransactions = await getUserTransactions(normalizedAddress);
      finalTransactions = mergeTransactions(finalTransactions, dbTransactions);
    }
    
   try {
      const { fetchAllTransactions } = require('./graphql');
      const debtTransactions = await fetchAllTransactions(normalizedAddress, req);
      
      // Filtrer pour ne garder que les debt tokens (borrows et repays)
      const filteredDebtTransactions = {
        borrows: debtTransactions.borrows || [],
        supplies: [],
        withdraws: [],
        repays: debtTransactions.repays || [],
        tokenTransfers: { usdc: [], armmwxdai: [], others: [], total: 0 },
        total: (debtTransactions.borrows?.length || 0) + (debtTransactions.repays?.length || 0)
      };
      
      finalTransactions = mergeTransactions(finalTransactions, filteredDebtTransactions);
      console.log(`✅ ${filteredDebtTransactions.total} debt transactions récupérées`);
      
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des debt tokens:', error);
    }
    
    // Récupérer les supply tokens via GnosisScan
    console.log(`🔄 Récupération des supply tokens via GnosisScan pour ${normalizedAddress}`);
    try {
      const supplyTransactions = await getSupplyTokenTransactions(normalizedAddress, req);
      
      // Filtrer pour ne garder que les supply tokens (supplies et withdraws)
      const filteredSupplyTransactions = {
        borrows: [],
        supplies: supplyTransactions.supplies || [],
        withdraws: supplyTransactions.withdraws || [],
        repays: [],
        tokenTransfers: { usdc: [], armmwxdai: [], others: [], total: 0 },
        total: (supplyTransactions.supplies?.length || 0) + (supplyTransactions.withdraws?.length || 0)
      };
      
      finalTransactions = mergeTransactions(finalTransactions, filteredSupplyTransactions);
      console.log(`✅ ${filteredSupplyTransactions.total} supply transactions récupérées`);
      
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des supply tokens:', error);
    }
    
    // Stocker en base si pas de données existantes
    if (!hasTransactions) {
      await storeUserTransactions(normalizedAddress, finalTransactions);
    }
    
    return finalTransactions;
    
  } catch (error) {
    if (req) {
      req.stopTimer('db_check');
      req.logEvent('db_check_error', { 
        address: normalizedAddress, 
        error: error.message 
      });
    }
    
    console.error('Erreur lors de la récupération des transactions:', error);
    throw error;
  }
}

/**
 * Détermine quelle méthode utiliser selon le type de token
 * @param {string} userAddress Adresse de l'utilisateur
 * @param {string} tokenType Type de token ('debt' ou 'supply')
 * @returns {boolean} true si on doit utiliser la méthode supply tokens
 */
async function shouldUseSupplyTokensMethodForUser(userAddress, tokenType = null) {
  // Si on spécifie un type de token, on choisit la méthode appropriée
  if (tokenType === 'debt') {
    return false; // Utiliser TheGraph pour les debt tokens
  } else if (tokenType === 'supply') {
    return true; // Utiliser GnosisScan pour les supply tokens
  }
  
  // Par défaut, on utilise la méthode supply tokens (GnosisScan)
  // car elle est plus complète pour les supply tokens
  return true;
}

/**
 * Récupère les transactions supply tokens via Gnosis Scan
 */
async function getSupplyTokenTransactions(userAddress, req = null) {
  try {
    console.log(`🚀 Récupération des transactions supply tokens pour ${userAddress}`);
    
    // Import des fonctions de supply tokens
    const { fetchSupplyTokenTransactions } = require('./supply-transactions');
    const { SUPPLY_TOKENS_CONFIG } = require('../../utils/constants');
    
    const allTransactions = {
      borrows: [],
      supplies: [],
      withdraws: [],
      repays: [],
      tokenTransfers: { usdc: [], armmwxdai: [], others: [], total: 0 },
      total: 0
    };
    
    // Récupérer les transactions pour chaque supply token (sauf rmmV2WXDAI pour l'instant)
    for (const [tokenSymbol, tokenConfig] of Object.entries(SUPPLY_TOKENS_CONFIG)) {
      // Skip rmmV2WXDAI pour l'instant car il cause des erreurs
      if (tokenSymbol === 'rmmV2WXDAI') {
        console.log(`⏭️  Skipping ${tokenSymbol} (temporairement désactivé)`);
        continue;
      }
      try {
        console.log(`📊 Récupération des transactions pour ${tokenSymbol}`);
        
        const transactions = await fetchSupplyTokenTransactions(userAddress, tokenSymbol);
        
        // Transformer les transactions au format attendu
        const transformedTransactions = transformSupplyTransactionsToStandard(transactions, tokenSymbol, tokenConfig);
        
        // Ajouter aux transactions globales
        allTransactions.supplies.push(...transformedTransactions.supplies);
        allTransactions.withdraws.push(...transformedTransactions.withdraws);
        allTransactions.repays.push(...transformedTransactions.repays);
        allTransactions.borrows.push(...transformedTransactions.borrows);
        
        console.log(`✅ ${transactions.length} transactions récupérées pour ${tokenSymbol}`);
        
      } catch (error) {
        console.error(`❌ Erreur lors de la récupération des transactions pour ${tokenSymbol}:`, error);
        // Continuer avec les autres tokens
      }
    }
    
    // Calculer le total
    allTransactions.total = allTransactions.borrows.length + 
                           allTransactions.supplies.length + 
                           allTransactions.withdraws.length + 
                           allTransactions.repays.length;
    
    console.log(`✅ Récupération terminée: ${allTransactions.total} transactions au total`);
    
    return allTransactions;
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des transactions supply tokens:', error);
    throw error;
  }
}

/**
 * Transforme les transactions supply tokens au format standard attendu par l'API
 */
function transformSupplyTransactionsToStandard(transactions, tokenSymbol, tokenConfig) {
  const { TOKENS } = require('../../utils/constants');
  
  // Déterminer le reserve.id basé sur le token
  let reserveId;
  if (tokenSymbol === 'armmV3WXDAI' || tokenSymbol === 'rmmV2WXDAI') {
    reserveId = TOKENS.WXDAI.reserveId;
  } else if (tokenSymbol === 'armmV3USDC') {
    reserveId = TOKENS.USDC.reserveId;
  }
  
  const result = {
    supplies: [],
    withdraws: [],
    repays: [],
    borrows: []
  };
  
  transactions.forEach(tx => {
    const baseTransaction = {
      txHash: tx.hash,
      amount: tx.amount,
      timestamp: parseInt(tx.timestamp),
      reserve: { id: reserveId },
      move: tx.moveType === 'move_in' ? 'in' : 'out',
      function: tx.functionName
    };
    
    // Classification des transactions selon les 5 types demandés
    let transactionType;
    
    // Déterminer le type de transaction basé sur la fonction et le moveType
    switch (tx.functionName) {
      case 'supply':
      case 'depositETH':
        transactionType = 'deposit'; // supply -> deposit
        break;
        
      case 'disperseToken':
        transactionType = 'disperse'; // disperseToken -> disperse
        break;
        
      case 'withdraw':
      case 'withdrawETH':
        transactionType = 'withdraw'; // withdraw -> withdraw
        break;
        
      case 'repayWithATokens':
        transactionType = 'repay'; // repay -> repay
        break;
        
      case 'borrow':
        transactionType = 'borrow'; // borrow -> borrow
        break;
        
      default:
        // Pour les autres fonctions, on les traite comme "others"
        transactionType = 'others';
        break;
    }
    
    // Ajouter la transaction au bon tableau selon le type
    const transactionWithType = {
      ...baseTransaction,
      type: transactionType
    };
    
    switch (transactionType) {
      case 'deposit':
        if (tx.moveType === 'move_in') {
          result.supplies.push(transactionWithType);
        }
        break;
        
      case 'withdraw':
        if (tx.moveType === 'move_out') {
          result.withdraws.push(transactionWithType);
        }
        break;
        
      case 'repay':
        if (tx.moveType === 'move_in') {
          result.repays.push(transactionWithType);
        }
        break;
        
      case 'borrow':
        if (tx.moveType === 'move_out') {
          result.borrows.push(transactionWithType);
        }
        break;
      default:
      case 'others':
        // Les "others" peuvent être ajoutés aux supplies ou withdraws selon le moveType
        if (tx.moveType === 'move_in') {
          result.supplies.push(transactionWithType);
        } else {
          result.withdraws.push(transactionWithType);
        }
        break;
    }
  });
  
  return result;
}

/**
 * Détecte et supprime les doublons basés sur le hash de transaction
 * Gère les transactions disperseToken qui peuvent avoir plusieurs entrées pour le même hash
 */
function removeDuplicates(transactions) {
  const hashGroups = new Map();
  const uniqueTransactions = [];
  
  // Grouper les transactions par hash
  transactions.forEach(tx => {
    const key = tx.txHash || tx.id || tx.hash;
    if (key) {
      if (!hashGroups.has(key)) {
        hashGroups.set(key, []);
      }
      hashGroups.get(key).push(tx);
    } else {
      // Si pas de hash, on garde la transaction mais on log
      console.log(`⚠️  Transaction sans hash détectée:`, tx);
      uniqueTransactions.push(tx);
    }
  });
  
  // Pour chaque groupe de transactions avec le même hash
  hashGroups.forEach((group, hash) => {
    if (group.length === 1) {
      // Une seule transaction avec ce hash
      uniqueTransactions.push(group[0]);
    } else {
      // Plusieurs transactions avec le même hash (doublons potentiels)
      console.log(`🔍 ${group.length} transactions avec le hash ${hash}:`);
      group.forEach(tx => {
        console.log(`  - Type: ${tx.type}, Amount: ${tx.amount}, Move: ${tx.move || 'N/A'}`);
      });
      
      // Pour les transactions disperseToken, on garde une seule entrée
      const disperseTransactions = group.filter(tx => tx.type === 'disperse');
      const otherTransactions = group.filter(tx => tx.type !== 'disperse');
      
      if (disperseTransactions.length > 0) {
        // Garder seulement la première transaction disperse
        uniqueTransactions.push(disperseTransactions[0]);
        console.log(`✅ Gardé 1 transaction disperse sur ${disperseTransactions.length}`);
      }
      
      // Garder les autres types de transactions
      otherTransactions.forEach(tx => {
        uniqueTransactions.push(tx);
      });
    }
  });
  
  const removedCount = transactions.length - uniqueTransactions.length;
  if (removedCount > 0) {
    console.log(`🧹 ${removedCount} doublons supprimés au total`);
  }
  
  return uniqueTransactions;
}

/**
 * Fusionne les transactions existantes avec les nouvelles en évitant les doublons
 */
function mergeTransactions(cached, newTransactions) {
  // Combiner toutes les transactions
  const allBorrows = [...(cached.borrows || []), ...(newTransactions.borrows || [])];
  const allSupplies = [...(cached.supplies || []), ...(newTransactions.supplies || [])];
  const allWithdraws = [...(cached.withdraws || []), ...(newTransactions.withdraws || [])];
  const allRepays = [...(cached.repays || []), ...(newTransactions.repays || [])];
  
  // Supprimer les doublons
  const uniqueBorrows = removeDuplicates(allBorrows);
  const uniqueSupplies = removeDuplicates(allSupplies);
  const uniqueWithdraws = removeDuplicates(allWithdraws);
  const uniqueRepays = removeDuplicates(allRepays);
  
  return {
    borrows: uniqueBorrows,
    supplies: uniqueSupplies,
    withdraws: uniqueWithdraws,
    repays: uniqueRepays,
    tokenTransfers: newTransactions.tokenTransfers || { usdc: [], armmwxdai: [], others: [], total: 0 },
    total: uniqueBorrows.length + uniqueSupplies.length + uniqueWithdraws.length + uniqueRepays.length
  };
}

module.exports = {
  createTables,
  hasUserTransactions,
  getUserTransactions,
  storeUserTransactions,
  getTransactions,
  shouldUseSupplyTokensMethodForUser,
  getSupplyTokenTransactions,
  transformSupplyTransactionsToStandard,
  removeDuplicates
}; 