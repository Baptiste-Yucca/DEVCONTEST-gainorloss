const express = require('express');
const router = express.Router();

// Variables pour stocker les logs de performance
let performanceLogs = [];
let timers = {};

/**
 * Endpoint de santé principal
 */
router.get('/api/health', (req, res) => {
  const startTime = req.startTimer('health_check');
  
  try {
    // Configuration de la base de données
    const dbConfig = {
      transactionsDb: 'data/transactions.db',
      ratesDb: 'data/rates.db'
    };
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: dbConfig,
      performance: {
        totalRequests: performanceLogs.length,
        averageResponseTime: calculateAverageResponseTime()
      }
    };
    
    req.stopTimer('health_check');
    req.logEvent('health_check_completed', { 
      status: 'healthy',
      dbConfig 
    });
    
    res.json(healthData);
    
  } catch (error) {
    req.stopTimer('health_check');
    req.logEvent('health_check_error', { 
      error: error.message 
    });
    
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Endpoint pour les logs de performance détaillés
 */
router.get('/api/health/performance', (req, res) => {
  const startTime = req.startTimer('performance_check');
  
  try {
    const performanceData = {
      logs: performanceLogs.slice(-50), // Derniers 50 logs
      timers: Object.keys(timers).map(name => ({
        name,
        avgTime: timers[name].totalTime / timers[name].count,
        count: timers[name].count,
        totalTime: timers[name].totalTime
      })),
      summary: {
        totalLogs: performanceLogs.length,
        totalTimers: Object.keys(timers).length
      }
    };
    
    req.stopTimer('performance_check');
    req.logEvent('performance_check_completed', { 
      logsCount: performanceLogs.length,
      timersCount: Object.keys(timers).length
    });
    
    res.json(performanceData);
    
  } catch (error) {
    req.stopTimer('performance_check');
    req.logEvent('performance_check_error', { 
      error: error.message 
    });
    
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Endpoint pour un résumé des performances
 */
router.get('/api/health/performance/summary', (req, res) => {
  const startTime = req.startTimer('performance_summary');
  
  try {
    // Calculer les statistiques des timers
    const timerStats = Object.keys(timers).map(name => {
      const timer = timers[name];
      return {
        name,
        averageTime: `${(timer.totalTime / timer.count).toFixed(2)}ms`,
        count: timer.count,
        totalTime: `${timer.totalTime.toFixed(2)}ms`
      };
    });
    
    // Trouver les timers les plus lents
    const slowestTimers = timerStats
      .sort((a, b) => parseFloat(b.averageTime) - parseFloat(a.averageTime))
      .slice(0, 5);
    
    const summaryData = {
      timestamp: new Date().toISOString(),
      totalRequests: performanceLogs.length,
      activeTimers: timerStats.length,
      slowestOperations: slowestTimers,
      databaseStats: {
        transactionsDb: 'data/transactions.db',
        ratesDb: 'data/rates.db',
        status: 'active'
      }
    };
    
    req.stopTimer('performance_summary');
    req.logEvent('performance_summary_completed', { 
      totalRequests: performanceLogs.length,
      slowestTimers: slowestTimers.length
    });
    
    res.json(summaryData);
    
  } catch (error) {
    req.stopTimer('performance_summary');
    req.logEvent('performance_summary_error', { 
      error: error.message 
    });
    
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Endpoint pour vérifier l'état de la base de données
 */
router.post('/api/health/database/status', async (req, res) => {
  const startTime = req.startTimer('database_status_check');
  
  try {
    // Vérifier l'état des bases de données
    const fs = require('fs');
    const path = require('path');
    
    const transactionsDbPath = path.join(__dirname, '../../data/transactions.db');
    const ratesDbPath = path.join(__dirname, '../../data/rates.db');
    
    const dbStatus = {
      transactions: {
        exists: fs.existsSync(transactionsDbPath),
        size: fs.existsSync(transactionsDbPath) ? fs.statSync(transactionsDbPath).size : 0
      },
      rates: {
        exists: fs.existsSync(ratesDbPath),
        size: fs.existsSync(ratesDbPath) ? fs.statSync(ratesDbPath).size : 0
      }
    };
    
    req.stopTimer('database_status_check');
    req.logEvent('database_status_check_completed', dbStatus);
    
    res.json({
      status: 'success',
      message: 'Database status check completed',
      result: dbStatus,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    req.stopTimer('database_status_check');
    req.logEvent('database_status_check_error', { 
      error: error.message 
    });
    
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Fonction pour calculer le temps de réponse moyen
 */
function calculateAverageResponseTime() {
  if (performanceLogs.length === 0) return 0;
  
  const totalTime = performanceLogs.reduce((sum, log) => {
    return sum + (log.totalTime || 0);
  }, 0);
  
  return totalTime / performanceLogs.length;
}

/**
 * Fonction pour ajouter un log de performance
 */
function addPerformanceLog(log) {
  performanceLogs.push(log);
  
  // Garder seulement les 1000 derniers logs
  if (performanceLogs.length > 1000) {
    performanceLogs = performanceLogs.slice(-1000);
  }
}

/**
 * Fonction pour ajouter un timer
 */
function addTimer(name, time) {
  if (!timers[name]) {
    timers[name] = { count: 0, totalTime: 0 };
  }
  
  timers[name].count++;
  timers[name].totalTime += time;
}

// Exporter le router
module.exports = router; 