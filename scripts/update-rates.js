#!/usr/bin/env node

const fetch = require('node-fetch');
const { insertRates, getLastDate, getStats } = require('./database');

// Import depuis les constantes centralisées
const { TOKENS } = require('../utils/constants.js');

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
 * Convertit une date YYYYMMDD en timestamp
 */
function dateYYYYMMDDToTimestamp(dateStr) {
  if (!dateStr || dateStr.length !== 8) {
    throw new Error(`Format de date invalide: ${dateStr}`);
  }
  
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1; // JS utilise 0-11 pour les mois
  const day = parseInt(dateStr.substring(6, 8));
  
  const date = new Date(year, month, day);
  return Math.floor(date.getTime() / 1000);
}

/**
 * Met à jour les taux pour tous les tokens
 */
async function updateRates() {
  console.log('🔄 Début de la mise à jour des taux d\'intérêt');
  console.log(`⏰ ${new Date().toLocaleString('fr-FR')}`);
  
  let totalNewRates = 0;
  let hasErrors = false;
  
  try {
    for (const [tokenName, tokenConfig] of Object.entries(TOKENS)) {
      console.log(`\n💰 Mise à jour de ${tokenName}...`);
      
      try {
        // Récupérer la dernière date disponible dans la base
        const lastDate = await getLastDate(tokenName);
        
        let fromTimestamp;
        if (lastDate) {
          // Si on a déjà des données, récupérer depuis la dernière date
          fromTimestamp = dateYYYYMMDDToTimestamp(lastDate);
          console.log(`📅 Dernière date en base: ${formatDateYYYYMMDD(lastDate)}`);
          console.log(`📅 Récupération depuis: ${new Date(fromTimestamp * 1000).toLocaleDateString('fr-FR')}`);
        } else {
          // Si pas de données, récupérer depuis 7 jours en arrière
          fromTimestamp = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
          console.log(`📅 Aucune donnée en base, récupération depuis 7 jours en arrière`);
        }
        
        // Récupérer les nouveaux taux depuis l'API
        const ratesData = await fetchRatesFromAPI(tokenConfig.reserveId, fromTimestamp);
        
        if (ratesData.length === 0) {
          console.log(`✅ Aucun nouveau taux pour ${tokenName}`);
          continue;
        }
        
        // Filtrer les données pour ne garder que les nouvelles
        let newRatesData = ratesData;
        if (lastDate) {
          newRatesData = ratesData.filter(rate => {
            const year = rate.x.year;
            const monthHuman = String(rate.x.month + 1).padStart(2, '0'); // +1 pour format humain
            const day = String(rate.x.date).padStart(2, '0');
            const dateKey = `${year}${monthHuman}${day}`;
            return dateKey > lastDate;
          });
        }
        
        if (newRatesData.length === 0) {
          console.log(`✅ Aucun nouveau taux pour ${tokenName} (tous déjà en base)`);
          continue;
        }
        
        console.log(`🆕 ${newRatesData.length} nouveaux taux trouvés pour ${tokenName}`);
        
        // Afficher la période des nouveaux taux
        if (newRatesData.length > 0) {
          const firstRateData = newRatesData[0];
          const lastRateData = newRatesData[newRatesData.length - 1];
          const firstDate = new Date(firstRateData.x.year, firstRateData.x.month, firstRateData.x.date);
          const lastDate = new Date(lastRateData.x.year, lastRateData.x.month, lastRateData.x.date);
          console.log(`📊 Nouveaux taux: ${firstDate.toLocaleDateString('fr-FR')} → ${lastDate.toLocaleDateString('fr-FR')}`);
        }
        
        // Insérer les nouveaux taux dans la base
        const result = await insertRates(tokenName, tokenConfig.reserveId, newRatesData);
        console.log(`✅ ${result.insertedCount} nouveaux taux insérés pour ${tokenName}`);
        
        totalNewRates += result.insertedCount;
        
        if (result.errors.length > 0) {
          console.warn(`⚠️  ${result.errors.length} erreurs lors de l'insertion pour ${tokenName}`);
          console.log('Premières erreurs:', result.errors.slice(0, 3));
          hasErrors = true;
        }
        
      } catch (error) {
        console.error(`❌ Erreur lors du traitement de ${tokenName}:`, error.message);
        hasErrors = true;
      }
    }
    
    // Afficher le résumé
    console.log('\n📈 Résumé de la mise à jour:');
    console.log(`🆕 ${totalNewRates} nouveaux taux insérés au total`);
    
    if (hasErrors) {
      console.log('⚠️  Des erreurs ont été rencontrées pendant la mise à jour');
    }
    
    // Afficher les statistiques finales
    console.log('\n📊 Statistiques actuelles de la base:');
    const stats = await getStats();
    
    if (stats.length === 0) {
      console.log('🔍 Aucune donnée trouvée dans la base');
    } else {
      console.table(stats.map(stat => ({
        Token: stat.token,
        'Nombre d\'entrées': stat.count,
        'Date la plus récente': stat.latest_date ? formatDateYYYYMMDD(stat.latest_date) : 'N/A'
      })));
    }
    
    console.log('\n🎉 Mise à jour terminée !');
    
    // Code de sortie : 0 si succès, 1 si erreurs
    process.exit(hasErrors ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Erreur critique lors de la mise à jour:', error);
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
  updateRates().catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });
}

module.exports = {
  updateRates,
  fetchRatesFromAPI,
  TOKENS
}; 