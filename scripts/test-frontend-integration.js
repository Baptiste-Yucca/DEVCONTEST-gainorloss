#!/usr/bin/env node

/**
 * Script de test pour vérifier l'intégration frontend-backend
 * Teste l'API RPC et compare avec les autres méthodes
 */

const fetch = require('node-fetch');

// Configuration
const TEST_ADDRESS = '0xE2B1c037C0E5425e4B3102d9122f53365ADa9905';
const BACKEND_URL = 'http://localhost:3001';

// Couleurs pour la console
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

/**
 * Teste une route API et mesure le temps de réponse
 */
async function testRoute(route, description) {
  const startTime = Date.now();
  
  try {
    console.log(`${colors.blue}🔍 Test: ${description}${colors.reset}`);
    console.log(`   URL: ${BACKEND_URL}${route}`);
    
    const response = await fetch(`${BACKEND_URL}${route}`);
    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`${colors.green}✅ Succès en ${duration}ms${colors.reset}`);
      
      // Afficher les balances
      if (data.data?.balances) {
        console.log('   Balances:');
        Object.entries(data.data.balances).forEach(([key, balance]) => {
          const status = parseFloat(balance.formatted) > 0 ? '💰' : '💨';
          console.log(`   ${status} ${key}: ${balance.formatted} ${balance.symbol}`);
        });
      }
      
      return { success: true, duration, data };
    } else {
      throw new Error(data.error || 'Erreur API');
    }
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`${colors.red}❌ Erreur en ${duration}ms: ${error.message}${colors.reset}`);
    return { success: false, duration, error: error.message };
  }
}

/**
 * Compare les performances des différentes APIs
 */
async function compareAPIs() {
  console.log(`${colors.bold}🚀 Test d'intégration Frontend-Backend${colors.reset}`);
  console.log('==========================================');
  console.log(`📋 Adresse de test: ${TEST_ADDRESS}`);
  console.log(`🌐 Backend URL: ${BACKEND_URL}`);
  console.log('');
  
  const results = [];
  
  // Test RPC (nouvelle méthode)
  const rpcResult = await testRoute(`/api/balances/rpc/${TEST_ADDRESS}`, 'API RPC (Multicall)');
  results.push({ method: 'RPC', ...rpcResult });
  
  console.log('');
  
  // Test V3 (ancienne méthode)
  const v3Result = await testRoute(`/api/balances/v3/${TEST_ADDRESS}`, 'API V3 (GnosisScan)');
  results.push({ method: 'V3', ...v3Result });
  
  console.log('');
  
  // Résumé des performances
  console.log(`${colors.bold}📊 Résumé des performances:${colors.reset}`);
  console.log('==========================');
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const color = result.success ? colors.green : colors.red;
    console.log(`${status} ${result.method}: ${color}${result.duration}ms${colors.reset}`);
  });
  
  // Recommandation
  const successfulResults = results.filter(r => r.success);
  if (successfulResults.length > 0) {
    const fastest = successfulResults.sort((a, b) => a.duration - b.duration)[0];
    console.log(`\n${colors.bold}🏆 Recommandation: ${fastest.method} (${fastest.duration}ms)${colors.reset}`);
  }
  
  // Vérification de la cohérence des données
  if (results.filter(r => r.success).length > 1) {
    console.log(`\n${colors.bold}🔍 Vérification de la cohérence:${colors.reset}`);
    
    const successfulData = results.filter(r => r.success).map(r => ({
      method: r.method,
      balances: r.data.data.balances
    }));
    
    // Comparer les balances entre les méthodes
    const keys = ['armmUSDC', 'armmWXDAI', 'debtUSDC', 'debtWXDAI'];
    
    keys.forEach(key => {
      const values = successfulData.map(d => d.balances[key]?.formatted || '0');
      const uniqueValues = [...new Set(values)];
      
      if (uniqueValues.length === 1) {
        console.log(`   ✅ ${key}: ${uniqueValues[0]} (cohérent)`);
      } else {
        console.log(`   ⚠️  ${key}: ${uniqueValues.join(' vs ')} (incohérent)`);
      }
    });
  }
}

/**
 * Teste la simulation d'un appel frontend
 */
async function testFrontendSimulation() {
  console.log(`\n${colors.bold}🎭 Simulation d'un appel frontend:${colors.reset}`);
  console.log('================================');
  
  try {
    // Simuler l'appel que ferait le frontend
    const response = await fetch(`${BACKEND_URL}/api/balances/rpc/${TEST_ADDRESS}`);
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Frontend recevrait ces données:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Erreur frontend:', data.error);
    }
    
  } catch (error) {
    console.log('❌ Erreur lors de la simulation frontend:', error.message);
  }
}

// Fonction principale
async function main() {
  try {
    await compareAPIs();
    await testFrontendSimulation();
    
    console.log(`\n${colors.green}✅ Tests terminés${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}❌ Erreur lors des tests:${colors.reset}`, error);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main();
}

module.exports = { compareAPIs, testFrontendSimulation }; 