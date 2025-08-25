const express = require('express');
const router = express.Router();

// Importer le service TheGraph V2
const { retrieveInterestAndTransactionsForAllTokensV2 } = require('../services/thegraph-interest-calculator-v2');

/**
 * @route GET /api/rmm/v2/:address1/:address2?/:address3?
 * @desc Endpoint V2 qui utilise TheGraph pour récupérer les données (WXDAI uniquement)
 * @access Public
 */
router.get('/:address1/:address2?/:address3?', async (req, res) => {

  
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
        // Utiliser directement TheGraph V2 pour récupérer les intérêts
        const interestCalculations = {};
        const interestanddataResults = await retrieveInterestAndTransactionsForAllTokensV2(address, req);

        // ✅ NOUVEAU: Récupérer les transactions depuis les résultats
        const { transactions, ...interestResult } = interestanddataResults;

        // Convertir le format pour compatibilité frontend
        const frontendCompatibleData = {
          address,
          // Format V3 compatible
          interests: {
            WXDAI: {
              token: 'WXDAI',
              borrow: {
                totalInterest: interestResult.borrow.totalInterest,
                dailyDetails: interestResult.borrow.dailyDetails
              },
              supply: {
                totalInterest: interestResult.supply.totalInterest,
                dailyDetails: interestResult.supply.dailyDetails
              },
              summary: {
                totalBorrowInterest: interestResult.borrow.totalInterest,
                totalSupplyInterest: interestResult.supply.totalInterest,
                netInterest: (BigInt(interestResult.supply.totalInterest) - BigInt(interestResult.borrow.totalInterest)).toString()
              }
            }
          },
          transactions: transactions,
        };
        results.push({ 
          address, 
          success: true, 
          data: frontendCompatibleData
        });
      } catch (error) {     
        console.error(`Erreur pour l'adresse V2 ${address}:`, error);
        results.push({ 
          address, 
          success: false, 
          error: error.message 
        });
      }
    }

    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);

    // Format de réponse compatible frontend (même structure que V3)
    const response = {
      success: true,
      data: {
        addresses: addresses,
        results: results,
        summary: {
          totalAddresses: addresses.length,
          successful: successfulResults.length,
          failed: failedResults.length,
          stablecoins: ['WXDAI'], // V2: seulement WXDAI
          version: 'v2'
        }
      }
    };

    res.json(response);

  } catch (error) {
    
    console.error('Erreur dans /api/rmm/v2:', error);
    res.status(500).json({
      error: 'Erreur lors du traitement des adresses V2',
      message: error.message
    });
  }
});

module.exports = router; 