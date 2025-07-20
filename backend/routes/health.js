const express = require('express');
const router = express.Router();
const { getStats } = require('../scripts/database');

/**
 * @route GET /api/health
 * @desc Vérifier l'état de santé du serveur
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Vérifier la base de données
    let dbStatus = 'unknown';
    let dbStats = null;
    
    try {
      dbStats = await getStats();
      dbStatus = 'healthy';
    } catch (error) {
      dbStatus = 'error';
      console.error('Erreur base de données:', error.message);
    }

    const responseTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        responseTime: `${responseTime}ms`,
        services: {
          database: {
            status: dbStatus,
            stats: dbStats
          }
        },
        environment: {
          node: process.version,
          platform: process.platform,
          memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
          }
        }
      }
    });

  } catch (error) {
    console.error('Erreur dans /api/health:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la vérification de santé',
      message: error.message
    });
  }
});

/**
 * @route GET /api/health/detailed
 * @desc Vérification détaillée de l'état du serveur
 * @access Public
 */
router.get('/detailed', async (req, res) => {
  try {
    const checks = {
      database: { status: 'unknown', details: null },
      memory: { status: 'unknown', details: null },
      disk: { status: 'unknown', details: null }
    };

    // Vérifier la base de données
    try {
      const dbStats = await getStats();
      checks.database = {
        status: 'healthy',
        details: {
          tokens: dbStats.length,
          totalEntries: dbStats.reduce((sum, stat) => sum + stat.count, 0),
          stats: dbStats
        }
      };
    } catch (error) {
      checks.database = {
        status: 'error',
        details: { error: error.message }
      };
    }

    // Vérifier la mémoire
    const memUsage = process.memoryUsage();
    const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    checks.memory = {
      status: memUsagePercent > 90 ? 'warning' : 'healthy',
      details: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
        external: Math.round(memUsage.external / 1024 / 1024) + 'MB',
        usagePercent: Math.round(memUsagePercent) + '%'
      }
    };

    // Vérifier l'espace disque (approximatif)
    try {
      const fs = require('fs');
      const path = require('path');
      const dbPath = path.join(__dirname, '../data/rates.db');
      
      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        const fileSizeMB = Math.round(stats.size / 1024 / 1024);
        
        checks.disk = {
          status: 'healthy',
          details: {
            databaseSize: fileSizeMB + 'MB',
            exists: true
          }
        };
      } else {
        checks.disk = {
          status: 'warning',
          details: {
            exists: false,
            message: 'Base de données non trouvée'
          }
        };
      }
    } catch (error) {
      checks.disk = {
        status: 'error',
        details: { error: error.message }
      };
    }

    // Déterminer le statut global
    const overallStatus = Object.values(checks).every(check => check.status === 'healthy') 
      ? 'healthy' 
      : Object.values(checks).some(check => check.status === 'error') 
        ? 'error' 
        : 'warning';

    res.json({
      success: true,
      data: {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks
      }
    });

  } catch (error) {
    console.error('Erreur dans /api/health/detailed:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la vérification détaillée',
      message: error.message
    });
  }
});

module.exports = router; 