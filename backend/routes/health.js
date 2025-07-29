const express = require('express');
const router = express.Router();

// Stockage des métriques de performance (en mémoire pour l'instant)
const performanceMetrics = {
  requests: [],
  maxRequests: 1000 // Limiter le nombre de requêtes stockées
};

/**
 * @route GET /api/health
 * @desc Endpoint de santé de l'API
 * @access Public
 */
router.get('/', (req, res) => {
  const startTime = req.startTimer('health_check');
  
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    };
    
    req.stopTimer('health_check');
    req.logEvent('health_check_completed', healthData);
    
    res.json(healthData);
  } catch (error) {
    req.stopTimer('health_check');
    req.logEvent('health_check_error', { error: error.message });
    
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route GET /api/health/performance
 * @desc Endpoint pour visualiser les métriques de performance
 * @access Public
 */
router.get('/performance', (req, res) => {
  const startTime = req.startTimer('performance_metrics');
  
  try {
    // Analyser les logs de performance de la requête actuelle
    const currentRequestLogs = req.performanceMetrics?.logs || [];
    
    // Calculer les statistiques des timers
    const timerStats = {};
    const eventStats = {};
    
    currentRequestLogs.forEach(log => {
      if (log.action === 'stop_timer') {
        const duration = parseFloat(log.duration.replace('ms', ''));
        if (!timerStats[log.name]) {
          timerStats[log.name] = {
            count: 0,
            totalTime: 0,
            minTime: Infinity,
            maxTime: 0,
            avgTime: 0
          };
        }
        
        timerStats[log.name].count++;
        timerStats[log.name].totalTime += duration;
        timerStats[log.name].minTime = Math.min(timerStats[log.name].minTime, duration);
        timerStats[log.name].maxTime = Math.max(timerStats[log.name].maxTime, duration);
        timerStats[log.name].avgTime = timerStats[log.name].totalTime / timerStats[log.name].count;
      } else if (log.action === 'event') {
        if (!eventStats[log.event]) {
          eventStats[log.event] = 0;
        }
        eventStats[log.event]++;
      }
    });
    
    // Formater les statistiques
    const formattedTimerStats = Object.entries(timerStats).map(([name, stats]) => ({
      name,
      count: stats.count,
      totalTime: `${stats.totalTime.toFixed(2)}ms`,
      avgTime: `${stats.avgTime.toFixed(2)}ms`,
      minTime: `${stats.minTime.toFixed(2)}ms`,
      maxTime: `${stats.maxTime.toFixed(2)}ms`
    }));
    
    const performanceData = {
      requestId: req.requestId,
      totalTime: req.performanceMetrics ? 
        `${(performance.now() - req.performanceMetrics.startTime).toFixed(2)}ms` : 
        'N/A',
      timers: formattedTimerStats,
      events: eventStats,
      logs: currentRequestLogs,
      summary: {
        totalTimers: Object.keys(timerStats).length,
        totalEvents: Object.keys(eventStats).length,
        totalLogs: currentRequestLogs.length
      }
    };
    
    req.stopTimer('performance_metrics');
    req.logEvent('performance_metrics_completed', { 
      requestId: req.requestId,
      timerCount: Object.keys(timerStats).length
    });
    
    res.json(performanceData);
  } catch (error) {
    req.stopTimer('performance_metrics');
    req.logEvent('performance_metrics_error', { error: error.message });
    
    res.status(500).json({
      error: 'Erreur lors de la récupération des métriques de performance',
      message: error.message
    });
  }
});

/**
 * @route GET /api/health/performance/summary
 * @desc Endpoint pour un résumé des performances
 * @access Public
 */
router.get('/performance/summary', (req, res) => {
  const startTime = req.startTimer('performance_summary');
  
  try {
    const currentRequestLogs = req.performanceMetrics?.logs || [];
    
    // Extraire les temps des principales opérations
    const summary = {
      requestId: req.requestId,
      totalTime: req.performanceMetrics ? 
        `${(performance.now() - req.performanceMetrics.startTime).toFixed(2)}ms` : 
        'N/A',
      operations: {}
    };
    
    // Chercher les timers principaux
    const mainTimers = [
      'rmm_v3_endpoint',
      'graphql_all_transactions',
      'gnosisscan_token_transfers',
      'interest_total_USDC',
      'interest_total_WXDAI',
      'db_rates_USDC',
      'db_rates_WXDAI'
    ];
    
    mainTimers.forEach(timerName => {
      const timerLog = currentRequestLogs.find(log => 
        log.action === 'stop_timer' && log.name === timerName
      );
      
      if (timerLog) {
        summary.operations[timerName] = timerLog.duration;
      }
    });
    
    // Compter les événements par type
    const eventCounts = {};
    currentRequestLogs.forEach(log => {
      if (log.action === 'event') {
        eventCounts[log.event] = (eventCounts[log.event] || 0) + 1;
      }
    });
    
    summary.events = eventCounts;
    
    req.stopTimer('performance_summary');
    req.logEvent('performance_summary_completed', { 
      requestId: req.requestId,
      operationCount: Object.keys(summary.operations).length
    });
    
    res.json(summary);
  } catch (error) {
    req.stopTimer('performance_summary');
    req.logEvent('performance_summary_error', { error: error.message });
    
    res.status(500).json({
      error: 'Erreur lors de la récupération du résumé de performance',
      message: error.message
    });
  }
});

module.exports = router; 