const express = require('express');
const router = express.Router();
const { fetchAllTransactions } = require('../services/graphql');

// Configuration des stablecoins
const STABLECOINS = {
  USDC: {
    symbol: 'USDC',
    reserveId: '0xddafbb505ad214d7b80b1f830fccc89b60fb7a830xdaa06cf7adceb69fcfde68d896818b9938984a70',
    decimals: 6
  },
  WXDAI: {
    symbol: 'WXDAI',
    reserveId: '0xe91d153e0b41518a2ce8dd3d7944fa863463a97d0xdaa06cf7adceb69fcfde68d896818b9938984a70',
    decimals: 18
  }
};

/**
 * Identifie le stablecoin basé sur le reserve.id
 */
function identifyStablecoin(reserveId) {
  if (reserveId === STABLECOINS.USDC.reserveId) {
    return 'USDC';
  } else if (reserveId === STABLECOINS.WXDAI.reserveId) {
    return 'WXDAI';
  }
  return 'UNKNOWN';
}



/**
 * @route GET /api/rmm/v3/:address1/:address2?/:address3?
 * @desc Endpoint principal qui utilise /transactions/ pour récupérer les données
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
        // Récupérer directement les transactions pour cette adresse
        const allTransactions = await fetchAllTransactions(address);
        
        // Grouper les transactions par stablecoin
        const transactionsByStablecoin = {
          USDC: {
            symbol: 'USDC',
            decimals: 6,
            borrows: [],
            supplies: [],
            withdraws: [],
            repays: []
          },
          WXDAI: {
            symbol: 'WXDAI',
            decimals: 18,
            borrows: [],
            supplies: [],
            withdraws: [],
            repays: []
          }
        };

        // Traiter les borrows
        if (allTransactions.borrows) {
          allTransactions.borrows.forEach(borrow => {
            const stablecoin = identifyStablecoin(borrow.reserve.id);
            if (stablecoin !== 'UNKNOWN') {
              // Supprimer reserve.id de la réponse
              const { reserve, ...borrowWithoutReserve } = borrow;
              transactionsByStablecoin[stablecoin].borrows.push(borrowWithoutReserve);
            }
          });
        }

        // Traiter les supplies
        if (allTransactions.supplies) {
          allTransactions.supplies.forEach(supply => {
            const stablecoin = identifyStablecoin(supply.reserve.id);
            if (stablecoin !== 'UNKNOWN') {
              // Supprimer reserve.id de la réponse
              const { reserve, ...supplyWithoutReserve } = supply;
              transactionsByStablecoin[stablecoin].supplies.push(supplyWithoutReserve);
            }
          });
        }

        // Traiter les withdraws (redeemUnderlyings)
        if (allTransactions.withdraws) {
          allTransactions.withdraws.forEach(withdraw => {
            const stablecoin = identifyStablecoin(withdraw.reserve.id);
            if (stablecoin !== 'UNKNOWN') {
              // Supprimer reserve.id de la réponse
              const { reserve, ...withdrawWithoutReserve } = withdraw;
              transactionsByStablecoin[stablecoin].withdraws.push(withdrawWithoutReserve);
            }
          });
        }

        // Traiter les repays
        if (allTransactions.repays) {
          allTransactions.repays.forEach(repay => {
            const stablecoin = identifyStablecoin(repay.reserve.id);
            if (stablecoin !== 'UNKNOWN') {
              // Supprimer reserve.id de la réponse
              const { reserve, ...repayWithoutReserve } = repay;
              transactionsByStablecoin[stablecoin].repays.push(repayWithoutReserve);
            }
          });
        }

        // Calculer les résumés par stablecoin
        Object.keys(transactionsByStablecoin).forEach(stablecoin => {
          const data = transactionsByStablecoin[stablecoin];
          data.summary = {
            borrows: data.borrows.length,
            supplies: data.supplies.length,
            withdraws: data.withdraws.length,
            repays: data.repays.length,
            total: data.borrows.length + data.supplies.length + data.withdraws.length + data.repays.length
          };
        });

        results.push({ 
          address, 
          success: true, 
          data: {
            address,
            transactions: transactionsByStablecoin,
            summary: {
              totalTransactions: allTransactions.total,
              stablecoins: Object.keys(transactionsByStablecoin).map(stablecoin => ({
                symbol: stablecoin,
                ...transactionsByStablecoin[stablecoin].summary
              }))
            }
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