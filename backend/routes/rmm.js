const express = require('express');
const router = express.Router();
const { getTransactionsWithCache } = require('../services/transaction-manager');
const { calculateInterestForToken } = require('../services/interest-calculator');

// Import depuis les constantes centralisées
const { TOKENS } = require('../../utils/constants.js');

/**
 * Identifie le stablecoin basé sur le reserve.id
 */
function identifyStablecoin(reserveId) {
  if (reserveId === TOKENS.USDC.reserveId) {
    return 'USDC';
  } else if (reserveId === TOKENS.WXDAI.reserveId) {
    return 'WXDAI';
  }
  return 'UNKNOWN';
}

/**
 * @route GET /api/rmm/v3/:address1/:address2?/:address3?
 * @desc Endpoint principal qui utilise le cache SQLite pour récupérer les données
 * @access Public
 */
router.get('/v3/:address1/:address2?/:address3?', async (req, res) => {
  const requestTimer = req.startTimer('rmm_v3_endpoint');
  
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

    req.logEvent('rmm_v3_started', { 
      addresses, 
      count: addresses.length 
    });

    const results = [];
    for (const address of addresses) {
      const addressTimer = req.startTimer(`address_${address}`);
      
      try {
        req.logEvent('processing_address', { address });
        
        // Récupérer les transactions depuis le cache ou TheGraph
        const allTransactions = await getTransactionsWithCache(address, req);
        
        // Grouper les transactions par stablecoin
        const transactionsByStablecoin = {
          USDC: {
            symbol: 'USDC',
            decimals: 6,
            debt: [], // Tableau consolidé pour borrows + repays
            supply: [] // Tableau consolidé pour supplies + withdraws + others
          },
          WXDAI: {
            symbol: 'WXDAI',
            decimals: 18,
            debt: [], // Tableau consolidé pour borrows + repays
            supply: [] // Tableau consolidé pour supplies + withdraws + others
          }
        };

        // Traiter les borrows
        if (allTransactions.borrows) {
          allTransactions.borrows.forEach(borrow => {
            const stablecoin = identifyStablecoin(borrow.reserve.id);
            if (stablecoin !== 'UNKNOWN') {
              // Supprimer reserve.id de la réponse et ajouter le type
              const { reserve, ...borrowWithoutReserve } = borrow;
              const borrowWithType = { ...borrowWithoutReserve, type: 'borrow' };
              transactionsByStablecoin[stablecoin].debt.push(borrowWithType);
            }
          });
        }

        // Traiter les supplies
        if (allTransactions.supplies) {
          allTransactions.supplies.forEach(supply => {
            const stablecoin = identifyStablecoin(supply.reserve.id);
            if (stablecoin !== 'UNKNOWN') {
              // Supprimer reserve.id de la réponse et ajouter le type
              const { reserve, ...supplyWithoutReserve } = supply;
              const supplyWithType = { ...supplyWithoutReserve, type: 'supply' };
              transactionsByStablecoin[stablecoin].supply.push(supplyWithType);
            }
          });
        }

        // Traiter les withdraws (redeemUnderlyings)
        if (allTransactions.withdraws) {
          allTransactions.withdraws.forEach(withdraw => {
            const stablecoin = identifyStablecoin(withdraw.reserve.id);
            if (stablecoin !== 'UNKNOWN') {
              // Supprimer reserve.id de la réponse et ajouter le type
              const { reserve, ...withdrawWithoutReserve } = withdraw;
              const withdrawWithType = { ...withdrawWithoutReserve, type: 'withdraw' };
              transactionsByStablecoin[stablecoin].supply.push(withdrawWithType);
            }
          });
        }

        // Traiter les repays
        if (allTransactions.repays) {
          allTransactions.repays.forEach(repay => {
            const stablecoin = identifyStablecoin(repay.reserve.id);
            if (stablecoin !== 'UNKNOWN') {
              // Supprimer reserve.id de la réponse et ajouter le type
              const { reserve, ...repayWithoutReserve } = repay;
              const repayWithType = { ...repayWithoutReserve, type: 'repay' };
              transactionsByStablecoin[stablecoin].debt.push(repayWithType);
            }
          });
        }

        // Traiter les transferts de tokens (others) - seulement si pas en cache
        if (allTransactions.tokenTransfers) {
          // Traiter les transferts USDC
          if (allTransactions.tokenTransfers.usdc) {
            allTransactions.tokenTransfers.usdc.forEach(transfer => {
              const transferWithType = {
                ...transfer,
                transactionType: 'token_transfer',
                type: transfer.transfer === 'in' ? 'other_in' : 'other_out'
              };
              transactionsByStablecoin.USDC.supply.push(transferWithType);
            });
          }

          // Traiter les transferts WXDAI
          if (allTransactions.tokenTransfers.armmwxdai) {
            allTransactions.tokenTransfers.armmwxdai.forEach(transfer => {
              const transferWithType = {
                ...transfer,
                transactionType: 'token_transfer',
                type: transfer.transfer === 'in' ? 'other_in' : 'other_out'
              };
              transactionsByStablecoin.WXDAI.supply.push(transferWithType);
            });
          }

          // Traiter les autres transferts (les ajouter aux deux stablecoins ou créer une section générale)
          if (allTransactions.tokenTransfers.others) {
            allTransactions.tokenTransfers.others.forEach(transfer => {
              const transferWithType = {
                ...transfer,
                transactionType: 'token_transfer',
                type: transfer.transfer === 'in' ? 'other_in' : 'other_out'
              };
              // Pour l'instant, on les ajoute à USDC par défaut, ou on pourrait créer une section "unknown"
              transactionsByStablecoin.USDC.supply.push(transferWithType);
            });
          }
        }

        // Trier les transactions par timestamp (plus ancien → plus récent) et calculer les résumés
        Object.keys(transactionsByStablecoin).forEach(stablecoin => {
          const data = transactionsByStablecoin[stablecoin];
          
          // Trier le tableau debt par timestamp croissant
          data.debt.sort((a, b) => a.timestamp - b.timestamp);
          
          // Trier le tableau supply par timestamp croissant
          data.supply.sort((a, b) => a.timestamp - b.timestamp);
          
                  // Calculer les compteurs depuis les tableaux consolidés
        const borrowsCount = data.debt.filter(tx => tx.type === 'borrow').length;
        const repaysCount = data.debt.filter(tx => tx.type === 'repay').length;
        const suppliesCount = data.supply.filter(tx => tx.type === 'supply').length;
        const withdrawsCount = data.supply.filter(tx => tx.type === 'withdraw').length;
        const otherInCount = data.supply.filter(tx => tx.type === 'other_in').length;
        const otherOutCount = data.supply.filter(tx => tx.type === 'other_out').length;
        
        data.summary = {
          borrows: borrowsCount,
          repays: repaysCount,
          debt: data.debt.length, // Nombre total de transactions de dette
          supplies: suppliesCount,
          withdraws: withdrawsCount,
          supply: data.supply.length, // Nombre total de transactions de supply
          other_in: otherInCount,
          other_out: otherOutCount,
          total: data.debt.length + data.supply.length
        };
        });

        // Calculer les intérêts pour chaque stablecoin
        const interestCalculations = {};
        for (const stablecoin of Object.keys(transactionsByStablecoin)) {
          try {
            // Utiliser les nouveaux tableaux debt et supply déjà triés chronologiquement
            const allTokenTransactions = [
              ...transactionsByStablecoin[stablecoin].debt.map(tx => ({ 
                ...tx, 
                transactionType: tx.type,
                amount: tx.amount || '0' // S'assurer que amount existe
              })),
              ...transactionsByStablecoin[stablecoin].supply.map(tx => ({ 
                ...tx, 
                transactionType: tx.type,
                amount: tx.amount || '0' // S'assurer que amount existe
              }))
            ];

            if (allTokenTransactions.length > 0) {
              console.log(`💰 Calcul des intérêts pour ${stablecoin} (${allTokenTransactions.length} transactions)`);
              const interestResult = await calculateInterestForToken(allTokenTransactions, stablecoin, req);
              interestCalculations[stablecoin] = interestResult;
            } else {
              console.log(`💰 Aucune transaction pour ${stablecoin}, pas de calcul d'intérêts`);
              interestCalculations[stablecoin] = {
                token: stablecoin,
                borrow: { totalInterest: "0", summary: { totalBorrows: "0", totalRepays: "0", currentDebt: "0", totalInterest: "0" } },
                supply: { totalInterest: "0", summary: { totalSupplies: "0", totalWithdraws: "0", totalOtherIn: "0", totalOtherOut: "0", currentSupply: "0", totalInterest: "0" } },
                summary: { totalBorrowInterest: "0", totalSupplyInterest: "0", netInterest: "0" }
              };
            }
          } catch (error) {
            console.error(`Erreur lors du calcul des intérêts pour ${stablecoin}:`, error);
            interestCalculations[stablecoin] = {
              token: stablecoin,
              error: error.message,
              borrow: { totalInterest: "0", summary: { totalBorrows: "0", totalRepays: "0", currentDebt: "0", totalInterest: "0" } },
              supply: { totalInterest: "0", summary: { totalSupplies: "0", totalWithdraws: "0", totalOtherIn: "0", totalOtherOut: "0", currentSupply: "0", totalInterest: "0" } },
              summary: { totalBorrowInterest: "0", totalSupplyInterest: "0", netInterest: "0" }
            };
          }
        }

        req.stopTimer(`address_${address}`);
        req.logEvent('address_processed_successfully', { 
          address, 
          totalTransactions: allTransactions.total || (allTransactions.borrows?.length + allTransactions.supplies?.length + allTransactions.withdraws?.length + allTransactions.repays?.length),
          stablecoins: Object.keys(transactionsByStablecoin)
        });

        results.push({ 
          address, 
          success: true, 
          data: {
            address,
            transactions: transactionsByStablecoin,
            interests: interestCalculations,
            summary: {
              totalTransactions: allTransactions.total || (allTransactions.borrows?.length + allTransactions.supplies?.length + allTransactions.withdraws?.length + allTransactions.repays?.length),
              stablecoins: Object.keys(transactionsByStablecoin).map(stablecoin => ({
                symbol: stablecoin,
                ...transactionsByStablecoin[stablecoin].summary,
                interests: interestCalculations[stablecoin]?.summary || { totalBorrowInterest: "0", totalSupplyInterest: "0", netInterest: "0" }
              }))
            }
          }
        });
      } catch (error) {
        req.stopTimer(`address_${address}`);
        req.logEvent('address_processing_error', { 
          address, 
          error: error.message 
        });
        
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

    req.stopTimer('rmm_v3_endpoint');
    req.logEvent('rmm_v3_completed', { 
      totalAddresses: addresses.length,
      successful: successfulResults.length,
      failed: failedResults.length
    });

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
    req.stopTimer('rmm_v3_endpoint');
    req.logEvent('rmm_v3_error', { 
      error: error.message 
    });
    
    console.error('Erreur dans /api/rmm/v3:', error);
    res.status(500).json({
      error: 'Erreur lors du traitement des adresses',
      message: error.message
    });
  }
});

module.exports = router; 