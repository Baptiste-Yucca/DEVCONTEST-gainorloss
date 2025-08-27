const express = require('express');
const router = express.Router();

// Importer le nouveau service TheGraph
const { retrieveInterestAndTransactionsForAllTokens } = require('../services/thegraph-interest-calculator');

/**
 * @route GET /api/rmm/v3/:address1/:address2?/:address3?
 * @desc Endpoint principal qui utilise TheGraph pour récupérer les données
 * @access Public
 */
router.get('/v3/:address1/:address2?/:address3?', async (req, res) => {
  
  try {
    const { address1, address2, address3 } = req.params;
    const addresses = [address1, address2, address3].filter(addr => addr);

    // Validation des adresses
    for (const address of addresses) {
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return res.status(400).json({
          error: 'Adresse invalide',
          message: 'Toutes les adresses doivent être des adresses Ethereum valides (0x...)',
          invalidAddress: address
        });
      }
    }

    if (addresses.length === 0) {
      return res.status(400).json({
        error: 'Aucune adresse fournie',
        message: 'Au moins une adresse doit être fournie'
      });
    }

    if (addresses.length > 3) {
      return res.status(400).json({
        error: 'Trop d\'adresses',
        message: 'Maximum 3 adresses autorisées'
      });
    }

    const results = [];
    for (const address of addresses) {
      
      try {
 
        // Initialiser les calculs d'intérêts pour cette adresse
        const interestCalculations = {};
        
        //Récupérer les résultats
        const interestanddataResults = await retrieveInterestAndTransactionsForAllTokens(address, req);

        // Déstructurer en excluant 'transactions'
        const { transactions, ...interestResults } = interestanddataResults;

        // Extraire les résultats par token (sans transactions)
        for (const [stablecoin, interestResult] of Object.entries(interestResults)) {
          interestCalculations[stablecoin] = interestResult;
        }
        results.push({ 
          address, 
          success: true, 
          data: {
            address,
            interests: interestCalculations,
            transactions: transactions
          }
        });
      } catch (error) {       
        console.error(`Erreur pour l'adresse ${address}:`, error);
        results.push({ 
          address, 
          success: false, 
          error: error.message 
        });
      }
    }

    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);
    const response = {
      success: true,
      data: {
        addresses: addresses,
        results: results,
        summary: {
          totalAddresses: addresses.length,
          successful: successfulResults.length,
          failed: failedResults.length,
          stablecoins: ['USDC', 'WXDAI']
        }
      }
    };

    res.json(response);

  } catch (error) {  
    console.error('Erreur dans /api/rmm/v3:', error);
    res.status(500).json({
      error: 'Erreur lors du traitement des adresses',
      message: error.message
    });
  }
});

module.exports = router; 