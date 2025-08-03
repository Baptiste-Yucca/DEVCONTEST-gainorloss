// Charger les variables d'environnement du backend
require('dotenv').config({ path: './backend/.env' });

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Chemin vers la base de données
const DB_PATH = path.join(__dirname, '../data/transactions.db');

/**
 * Nettoie complètement la base de données des transactions
 */
async function cleanDatabase() {
  try {
    console.log('🧹 Début du nettoyage de la base de données...');
    
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('❌ Erreur lors de l\'ouverture de la base de données:', err);
        process.exit(1);
      }
    });
    
    // Compter les transactions avant suppression
    db.get('SELECT COUNT(*) as count FROM user_transactions', (err, row) => {
      if (err) {
        console.error('❌ Erreur lors du comptage des transactions:', err);
        db.close();
        process.exit(1);
      }
      
      const transactionCount = row ? row.count : 0;
      console.log(`📊 Transactions trouvées: ${transactionCount}`);
      
      if (transactionCount === 0) {
        console.log('✅ Base de données déjà vide !');
        db.close();
        return;
      }
      
      // Supprimer toutes les transactions
      db.run('DELETE FROM user_transactions', (err) => {
        if (err) {
          console.error('❌ Erreur lors de la suppression des transactions:', err);
          db.close();
          process.exit(1);
        }
        
        console.log(`🗑️  ${transactionCount} transactions supprimées avec succès !`);
        
        // Vérifier que la table est bien vide
        db.get('SELECT COUNT(*) as count FROM user_transactions', (err, row) => {
          if (err) {
            console.error('❌ Erreur lors de la vérification:', err);
          } else {
            const remainingCount = row ? row.count : 0;
            console.log(`✅ Vérification: ${remainingCount} transactions restantes`);
            
            if (remainingCount === 0) {
              console.log('🎉 Base de données nettoyée avec succès !');
            } else {
              console.log('⚠️  Il reste encore des transactions dans la base');
            }
          }
          
          db.close();
        });
      });
    });
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
    process.exit(1);
  }
}

/**
 * Affiche les statistiques de la base de données
 */
async function showDatabaseStats() {
  try {
    console.log('📊 Statistiques de la base de données...');
    
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('❌ Erreur lors de l\'ouverture de la base de données:', err);
        process.exit(1);
      }
    });
    
    // Compter les transactions par type
    db.all(`
      SELECT type, COUNT(*) as count 
      FROM user_transactions 
      GROUP BY type
    `, (err, rows) => {
      if (err) {
        console.error('❌ Erreur lors de la récupération des statistiques:', err);
        db.close();
        return;
      }
      
      console.log('\n📈 Répartition par type:');
      if (rows.length === 0) {
        console.log('  - Aucune transaction trouvée');
      } else {
        rows.forEach(row => {
          console.log(`  - ${row.type}: ${row.count} transactions`);
        });
      }
      
      // Compter les transactions par token
      db.all(`
        SELECT token, COUNT(*) as count 
        FROM user_transactions 
        GROUP BY token
      `, (err, tokenRows) => {
        if (err) {
          console.error('❌ Erreur lors de la récupération des statistiques par token:', err);
        } else {
          console.log('\n🪙 Répartition par token:');
          if (tokenRows.length === 0) {
            console.log('  - Aucune transaction trouvée');
          } else {
            tokenRows.forEach(row => {
              console.log(`  - ${row.token}: ${row.count} transactions`);
            });
          }
        }
        
        db.close();
      });
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'affichage des statistiques:', error);
  }
}

// Exécution du script
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'stats') {
    showDatabaseStats();
  } else {
    console.log('🧹 Nettoyage de la base de données...');
    console.log('⚠️  ATTENTION: Toutes les transactions seront supprimées !');
    console.log('💡 Utilisez "node scripts/clean-database.js stats" pour voir les statistiques');
    
    cleanDatabase();
  }
}

module.exports = { cleanDatabase, showDatabaseStats }; 