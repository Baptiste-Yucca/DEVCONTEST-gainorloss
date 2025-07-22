const express = require('express');
const router = express.Router();
const { getRates, getStats } = require('../../scripts/database');

// Import depuis les constantes centralisées
const { TOKENS } = require('../../utils/constants.js');

/**
 * @route POST /api/rates
 * @desc Récupérer les taux d'intérêt pour un token et une période
 * @access Public
 */
router.post('/', async (req, res) => {
  try {
    const { token, fromDate, toDate } = req.body;

    // Validation des paramètres
    if (!token || !fromDate) {
      return res.status(400).json({
        error: 'Paramètres manquants',
        message: 'Les paramètres "token" et "fromDate" sont requis',
        example: {
          token: 'USDC',
          fromDate: '20240101',
          toDate: '20241231' // optionnel
        }
      });
    }

    // Validation du token
    const validTokens = Object.keys(TOKENS);
    if (!validTokens.includes(token)) {
      return res.status(400).json({
        error: 'Token invalide',
        message: `Le token doit être l'un des suivants: ${validTokens.join(', ')}`,
        received: token
      });
    }

    // Validation du format de date
    const dateRegex = /^\d{8}$/;
    if (!dateRegex.test(fromDate)) {
      return res.status(400).json({
        error: 'Format de date invalide',
        message: 'fromDate doit être au format YYYYMMDD (ex: 20240101)',
        received: fromDate
      });
    }

    if (toDate && !dateRegex.test(toDate)) {
      return res.status(400).json({
        error: 'Format de date invalide',
        message: 'toDate doit être au format YYYYMMDD (ex: 20241231)',
        received: toDate
      });
    }

    console.log(`API /rates: Requête pour ${token} depuis ${fromDate}${toDate ? ` jusqu'à ${toDate}` : ''}`);

    // Récupérer les taux depuis la base de données
    const rates = await getRates(token, fromDate, toDate);

    console.log(`API /rates: ${rates.length} taux trouvés pour ${token}`);

    res.json({
      success: true,
      data: {
        token,
        fromDate,
        toDate: toDate || 'jusqu\'à aujourd\'hui',
        count: rates.length,
        rates
      }
    });

  } catch (error) {
    console.error('Erreur dans /api/rates:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des taux',
      message: error.message
    });
  }
});

/**
 * @route GET /api/rates/stats
 * @desc Obtenir les statistiques de la base de données des taux
 * @access Public
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await getStats();
    
    res.json({
      success: true,
      data: {
        stats,
        summary: {
          totalTokens: stats.length,
          totalEntries: stats.reduce((sum, stat) => sum + stat.count, 0)
        }
      }
    });

  } catch (error) {
    console.error('Erreur dans /api/rates/stats:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des statistiques',
      message: error.message
    });
  }
});

/**
 * @route GET /api/rates/tokens
 * @desc Obtenir la liste des tokens supportés
 * @access Public
 */
router.get('/tokens', (req, res) => {
  res.json({
    success: true,
    data: {
      tokens: Object.values(TOKENS).map(token => ({
        symbol: token.symbol,
        name: token.symbol === 'USDC' ? 'USD Coin' : 'Wrapped XDAI',
        reserveId: token.reserveId,
        decimals: token.decimals
      }))
    }
  });
});

module.exports = router; 