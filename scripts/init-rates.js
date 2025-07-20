#!/usr/bin/env node

const fetch = require('node-fetch');
const { initializeDatabase, insertRates, getStats } = require('./database');

// Configuration des tokens
const TOKENS = {
  USDC: {
    reserveId: '0xddafbb505ad214d7b80b1f830fccc89b60fb7a830xdaa06cf7adceb69fcfde68d896818b9938984a70',
    symbol: 'USDC'
  },
  WXDAI: {
    reserveId: '0xe91d153e0b41518a2ce8dd3d7944fa863463a97d0xdaa06cf7adceb69fcfde68d896818b9938984a70',
    symbol: 'WXDAI'
  }
};

// Date de lancement du RMM : 24 janvier 2024
const RMM_LAUNCH_DATE = 1706061525; // Timestamp du 24 janvier 2024

/**
 * Récupère les taux depuis l'API RMM
 */
async function fetchRatesFromAPI(reserveId, fromTimestamp) {
  const url = `https://rmm-api.realtoken.network/data/rates-history?reserveId=${reserveId}&from=${fromTimestamp}&resolutionInHours=24`;
  
  console.log(`Récupération des taux depuis: ${url}`);
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`${data.length} entrées récupérées depuis l'API`);
    
    return data;
  } catch (error) {
    console.error('Erreur lors de la récupération des taux:', error);
    throw error;
  }
}

/**
 * Initialise la base de données avec tous les taux historiques
 */
async function initializeRates() {
  console.log('🚀 Début de l\'initialisation de la base de données des taux d\'intérêt');
  console.log(`📅 Récupération des données depuis le ${new Date(RMM_LAUNCH_DATE * 1000).toLocaleDateString('fr-FR')}`);
  
  try {
    // 1. Initialiser la base de données
    console.log('\n📦 Initialisation de la base de données...');
    await initializeDatabase();
    
    // 2. Récupérer et insérer les taux pour chaque token
    for (const [tokenName, tokenConfig] of Object.entries(TOKENS)) {
      console.log(`\n💰 Traitement de ${tokenName}...`);
      
      try {
        // Récupérer les taux depuis l'API
        const ratesData = await fetchRatesFromAPI(tokenConfig.reserveId, RMM_LAUNCH_DATE);
        
        if (ratesData.length === 0) {
          console.warn(`⚠️  Aucune donnée reçue pour ${tokenName}`);
          continue;
        }
        
        // Afficher quelques infos sur les données récupérées
        const firstRateData = ratesData[0];
        const lastRateData = ratesData[ratesData.length - 1];
        const firstDate = new Date(firstRateData.x.year, firstRateData.x.month, firstRateData.x.date);
        const lastDate = new Date(lastRateData.x.year, lastRateData.x.month, lastRateData.x.date);
        console.log(`📊 Période couverte: ${firstDate.toLocaleDateString('fr-FR')} → ${lastDate.toLocaleDateString('fr-FR')}`);
        
        // Insérer les données dans la base
        const result = await insertRates(tokenName, tokenConfig.reserveId, ratesData);
        console.log(`✅ ${result.insertedCount} taux insérés pour ${tokenName}`);
        
        if (result.errors.length > 0) {
          console.warn(`⚠️  ${result.errors.length} erreurs lors de l'insertion pour ${tokenName}`);
          console.log('Premières erreurs:', result.errors.slice(0, 5));
        }
        
      } catch (error) {
        console.error(`❌ Erreur lors du traitement de ${tokenName}:`, error.message);
      }
    }
    
    // 3. Afficher les statistiques finales
    console.log('\n📈 Statistiques de la base de données:');
    const stats = await getStats();
    
    if (stats.length === 0) {
      console.log('🔍 Aucune donnée trouvée dans la base');
    } else {
      console.table(stats.map(stat => ({
        Token: stat.token,
        'Nombre d\'entrées': stat.count,
        'Date la plus ancienne': stat.earliest_date ? formatDateYYYYMMDD(stat.earliest_date) : 'N/A',
        'Date la plus récente': stat.latest_date ? formatDateYYYYMMDD(stat.latest_date) : 'N/A'
      })));
    }
    
    console.log('\n🎉 Initialisation terminée avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    process.exit(1);
  }
}

/**
 * Formate une date au format YYYYMMDD en format lisible
 */
function formatDateYYYYMMDD(dateStr) {
  if (!dateStr || dateStr.length !== 8) return dateStr;
  
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  
  return `${day}/${month}/${year}`;
}

// Exécuter le script si appelé directement
if (require.main === module) {
  initializeRates().catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });
}

module.exports = {
  initializeRates,
  fetchRatesFromAPI,
  TOKENS,
  RMM_LAUNCH_DATE
}; 