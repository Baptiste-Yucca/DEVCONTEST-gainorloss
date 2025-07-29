const fetch = require('node-fetch');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const GNOSISSCAN_API_KEY = process.env.GNOSISSCAN_API_KEY;
const BATCH_SIZE = 10; // Nombre d'adresses à traiter par batch
const DELAY_BETWEEN_BATCHES = 2000; // 2 secondes entre les batches

// Tokens à analyser
const TOKENS = [
  {
    symbol: 'armmUSDC',
    address: '0xed56f76e9cbc6a64b821e9c016eafbd3db5436d1',
    name: 'RealT RMM V3 USDC'
  },
  {
    symbol: 'armmWXDAI',
    address: '0x6a95d3d2a3f7c4351d5e4a27ca48ddc9850c5d25',
    name: 'RealT RMM V3 WXDAI'
  }
];

// Chemin vers la base de données
const DB_PATH = path.join(__dirname, '../data/transactions.db');

/**
 * Initialise la base de données
 */
function initDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Erreur lors de l\'ouverture de la base de données:', err);
        reject(err);
        return;
      }
    });

    // Créer la table de suivi des holders
    const createHoldersTable = `
      CREATE TABLE IF NOT EXISTS top_holders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token_symbol TEXT NOT NULL,
        token_address TEXT NOT NULL,
        holder_address TEXT NOT NULL,
        balance TEXT NOT NULL,
        balance_decimal REAL NOT NULL,
        rank INTEGER NOT NULL,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        processed BOOLEAN DEFAULT FALSE,
        UNIQUE(token_symbol, holder_address)
      )
    `;

    db.run(createHoldersTable, (err) => {
      if (err) {
        console.error('Erreur lors de la création de la table top_holders:', err);
        reject(err);
        return;
      }
      console.log('✅ Table top_holders créée/vérifiée.');
      db.close();
      resolve();
    });
  });
}

/**
 * Récupère les top holders d'un token via GnosisScan
 */
async function fetchTopHolders(tokenAddress, tokenSymbol) {
  if (!GNOSISSCAN_API_KEY) {
    throw new Error('GNOSISSCAN_API_KEY manquante dans les variables d\'environnement');
  }

  const url = `https://api.gnosisscan.io/api?module=token&action=tokenholderlist&contractaddress=${tokenAddress}&page=1&offset=100&apikey=${GNOSISSCAN_API_KEY}`;
  
  console.log(`🔍 Récupération des top holders pour ${tokenSymbol}...`);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== '1') {
      throw new Error(`Erreur GnosisScan: ${data.message}`);
    }
    
    const holders = data.result.map((holder, index) => ({
      address: holder.TokenHolderAddress,
      balance: holder.TokenHolderQuantity,
      balance_decimal: parseFloat(holder.TokenHolderQuantity),
      rank: index + 1
    }));
    
    console.log(`✅ ${holders.length} holders récupérés pour ${tokenSymbol}`);
    return holders;
  } catch (error) {
    console.error(`❌ Erreur lors de la récupération des holders pour ${tokenSymbol}:`, error.message);
    return [];
  }
}

/**
 * Sauvegarde les holders dans la base de données
 */
function saveHoldersToDatabase(tokenSymbol, tokenAddress, holders) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH);
    
    const insertSQL = `
      INSERT OR REPLACE INTO top_holders 
      (token_symbol, token_address, holder_address, balance, balance_decimal, rank, last_updated)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    
    const stmt = db.prepare(insertSQL);
    let insertedCount = 0;
    
    holders.forEach((holder) => {
      stmt.run([
        tokenSymbol,
        tokenAddress,
        holder.address,
        holder.balance,
        holder.balance_decimal,
        holder.rank
      ], (err) => {
        if (err) {
          console.error('Erreur lors de l\'insertion:', err);
        } else {
          insertedCount++;
        }
      });
    });
    
    stmt.finalize((err) => {
      if (err) {
        console.error('Erreur lors de la finalisation:', err);
        reject(err);
      } else {
        console.log(`✅ ${insertedCount} holders sauvegardés pour ${tokenSymbol}`);
        db.close();
        resolve(insertedCount);
      }
    });
  });
}

/**
 * Récupère les holders non traités
 */
function getUnprocessedHolders() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH);
    
    const sql = `
      SELECT th.*, t.name as token_name
      FROM top_holders th
      LEFT JOIN (
        SELECT 'armmUSDC' as symbol, 'RealT RMM V3 USDC' as name
        UNION ALL
        SELECT 'armmWXDAI' as symbol, 'RealT RMM V3 WXDAI' as name
      ) t ON th.token_symbol = t.symbol
      WHERE th.processed = FALSE
      ORDER BY th.token_symbol, th.rank
    `;
    
    db.all(sql, [], (err, rows) => {
      db.close();
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

/**
 * Appelle le backend pour récupérer les transactions d'un holder
 */
async function fetchHolderTransactions(holderAddress, tokenSymbol) {
  const url = `${BACKEND_URL}/api/transactions/${holderAddress}`;
  
  try {
    console.log(`🔄 Récupération des transactions pour ${holderAddress} (${tokenSymbol})...`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ ${data.transactions?.length || 0} transactions récupérées pour ${holderAddress}`);
      return data.transactions || [];
    } else {
      console.log(`⚠️ Aucune transaction pour ${holderAddress}: ${data.message}`);
      return [];
    }
  } catch (error) {
    console.error(`❌ Erreur lors de la récupération des transactions pour ${holderAddress}:`, error.message);
    return [];
  }
}

/**
 * Marque un holder comme traité
 */
function markHolderAsProcessed(holderAddress, tokenSymbol) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH);
    
    const sql = `UPDATE top_holders SET processed = TRUE WHERE holder_address = ? AND token_symbol = ?`;
    
    db.run(sql, [holderAddress, tokenSymbol], (err) => {
      db.close();
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Traite un batch d'holders
 */
async function processBatch(holders) {
  console.log(`\n📦 Traitement du batch de ${holders.length} holders...`);
  
  for (let i = 0; i < holders.length; i++) {
    const holder = holders[i];
    
    try {
      // Récupérer les transactions
      const transactions = await fetchHolderTransactions(holder.holder_address, holder.token_symbol);
      
      // Marquer comme traité
      await markHolderAsProcessed(holder.holder_address, holder.token_symbol);
      
      console.log(`✅ ${holder.holder_address} traité (${i + 1}/${holders.length})`);
      
      // Délai entre les appels pour éviter de surcharger l'API
      if (i < holders.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`❌ Erreur lors du traitement de ${holder.holder_address}:`, error.message);
    }
  }
}

/**
 * Fonction principale
 */
async function main() {
  try {
    console.log('🚀 Démarrage du script de remplissage de la base de données...\n');
    
    // Vérifier les variables d'environnement
    if (!GNOSISSCAN_API_KEY) {
      throw new Error('GNOSISSCAN_API_KEY manquante. Ajoutez-la dans vos variables d\'environnement.');
    }
    
    // Initialiser la base de données
    await initDatabase();
    
    // Récupérer les top holders pour chaque token
    for (const token of TOKENS) {
      console.log(`\n🎯 Traitement du token: ${token.symbol}`);
      
      // Récupérer les holders
      const holders = await fetchTopHolders(token.address, token.symbol);
      
      if (holders.length > 0) {
        // Sauvegarder dans la base
        await saveHoldersToDatabase(token.symbol, token.address, holders);
      }
    }
    
    // Traiter les holders par batches
    console.log('\n🔄 Début du traitement des transactions...');
    
    let processedCount = 0;
    let batchNumber = 1;
    
    while (true) {
      // Récupérer les holders non traités
      const unprocessedHolders = await getUnprocessedHolders();
      
      if (unprocessedHolders.length === 0) {
        console.log('\n✅ Tous les holders ont été traités !');
        break;
      }
      
      // Prendre un batch
      const batch = unprocessedHolders.slice(0, BATCH_SIZE);
      
      console.log(`\n📦 Batch ${batchNumber}: ${batch.length} holders à traiter`);
      
      // Traiter le batch
      await processBatch(batch);
      
      processedCount += batch.length;
      batchNumber++;
      
      // Délai entre les batches
      if (unprocessedHolders.length > BATCH_SIZE) {
        console.log(`⏳ Attente de ${DELAY_BETWEEN_BATCHES}ms avant le prochain batch...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }
    
    console.log(`\n🎉 Script terminé ! ${processedCount} holders traités au total.`);
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution du script:', error.message);
    process.exit(1);
  }
}

/**
 * Affiche les statistiques
 */
async function showStats() {
  try {
    const db = new sqlite3.Database(DB_PATH);
    
    const queries = [
      'SELECT COUNT(*) as total FROM top_holders',
      'SELECT COUNT(*) as processed FROM top_holders WHERE processed = TRUE',
      'SELECT COUNT(*) as pending FROM top_holders WHERE processed = FALSE',
      'SELECT token_symbol, COUNT(*) as count FROM top_holders GROUP BY token_symbol'
    ];
    
    console.log('\n📊 Statistiques de la base de données:');
    
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      db.get(query, [], (err, row) => {
        if (!err && row) {
          if (i === 0) console.log(`   • Total holders: ${row.total}`);
          if (i === 1) console.log(`   • Traités: ${row.processed}`);
          if (i === 2) console.log(`   • En attente: ${row.pending}`);
          if (i === 3) {
            db.all(query, [], (err, rows) => {
              if (!err && rows) {
                rows.forEach(r => console.log(`   • ${r.token_symbol}: ${r.count} holders`));
              }
              if (i === queries.length - 1) db.close();
            });
            return;
          }
        }
        if (i === queries.length - 1) db.close();
      });
    }
  } catch (error) {
    console.error('Erreur lors de l\'affichage des statistiques:', error);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'stats') {
    showStats();
  } else {
    main();
  }
}

module.exports = {
  main,
  showStats,
  fetchTopHolders,
  processBatch
}; 