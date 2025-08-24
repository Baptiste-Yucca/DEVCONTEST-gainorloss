#!/usr/bin/env node

const fetch = require('node-fetch');

// Import depuis les constantes centralisées
const { TOKENS } = require('../utils/constants.js');

async function debugAPI() {
  console.log('🔍 Test de l\'API RMM pour déboguer...');
  
  // Récupérer seulement quelques jours récents
  const fromTimestamp = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60); // 7 jours
  const reserveId = TOKENS.USDC.reserveId;
  const url = `https://rmm-api.realtoken.network/data/rates-history?reserveId=${reserveId}&from=${fromTimestamp}&resolutionInHours=24`;
  
  console.log(`📡 URL: ${url}`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`📊 ${data.length} entrées reçues`);
    
    if (data.length > 0) {
      console.log('\n🔍 Exemple de la première entrée:');
      console.log(JSON.stringify(data[0], null, 2));
      
      console.log('\n🔍 Exemple de la dernière entrée:');
      console.log(JSON.stringify(data[data.length - 1], null, 2));
      
      // Tester le traitement des dates
      console.log('\n📅 Test de traitement des dates:');
      const rate = data[0];
      
      console.log('Données brutes de x:', rate.x);
      
      // Format humain pour la clé
      const year = rate.x.year;
      const monthHuman = String(rate.x.month + 1).padStart(2, '0');
      const day = String(rate.x.date).padStart(2, '0');
      const dateKey = `${year}${monthHuman}${day}`;
      
      console.log(`Clé de date générée: ${dateKey}`);
      
      // Timestamp calculé
      const dateObj = new Date(rate.x.year, rate.x.month, rate.x.date, rate.x.hours || 0);
      const timestamp = Math.floor(dateObj.getTime() / 1000);
      
      console.log(`Date JavaScript créée: ${dateObj.toISOString()}`);
      console.log(`Timestamp calculé: ${timestamp}`);
      console.log(`Date vérifiée: ${new Date(timestamp * 1000).toLocaleDateString('fr-CH')}`);
      
      // Vérifier si rate.timestamp existe
      console.log(`Champ timestamp dans l'API: ${rate.timestamp || 'INEXISTANT'}`);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

if (require.main === module) {
  debugAPI();
} 