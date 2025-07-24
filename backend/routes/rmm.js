const express = require('express');
const router = express.Router();
const { fetchAllTransactions } = require('../services/graphql');
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
            debt: [], // Tableau consolidé pour borrows + repays
            supplies: [],
            withdraws: [],
            others: []
          },
          WXDAI: {
            symbol: 'WXDAI',
            decimals: 18,
            debt: [], // Tableau consolidé pour borrows + repays
            supplies: [],
            withdraws: [],
            others: []
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
              // Supprimer reserve.id de la réponse et ajouter le type
              const { reserve, ...repayWithoutReserve } = repay;
              const repayWithType = { ...repayWithoutReserve, type: 'repay' };
              transactionsByStablecoin[stablecoin].debt.push(repayWithType);
            }
          });
        }

        // Traiter les transferts de tokens (others)
        if (allTransactions.tokenTransfers) {
          // Traiter les transferts USDC
          if (allTransactions.tokenTransfers.usdc) {
            allTransactions.tokenTransfers.usdc.forEach(transfer => {
              transactionsByStablecoin.USDC.others.push({
                ...transfer,
                transactionType: 'token_transfer'
              });
            });
          }

          // Traiter les transferts WXDAI
          if (allTransactions.tokenTransfers.armmwxdai) {
            allTransactions.tokenTransfers.armmwxdai.forEach(transfer => {
              transactionsByStablecoin.WXDAI.others.push({
                ...transfer,
                transactionType: 'token_transfer'
              });
            });
          }

          // Traiter les autres transferts (les ajouter aux deux stablecoins ou créer une section générale)
          if (allTransactions.tokenTransfers.others) {
            allTransactions.tokenTransfers.others.forEach(transfer => {
              // Pour l'instant, on les ajoute à USDC par défaut, ou on pourrait créer une section "unknown"
              transactionsByStablecoin.USDC.others.push({
                ...transfer,
                transactionType: 'token_transfer'
              });
            });
          }
        }

        // Trier les transactions de dette par timestamp (plus ancien → plus récent) et calculer les résumés
        Object.keys(transactionsByStablecoin).forEach(stablecoin => {
          const data = transactionsByStablecoin[stablecoin];
          
          // Trier le tableau debt par timestamp croissant
          data.debt.sort((a, b) => a.timestamp - b.timestamp);
          
          // Calculer les compteurs depuis le tableau debt
          const borrowsCount = data.debt.filter(tx => tx.type === 'borrow').length;
          const repaysCount = data.debt.filter(tx => tx.type === 'repay').length;
          
          data.summary = {
            borrows: borrowsCount,
            repays: repaysCount,
            debt: data.debt.length, // Nombre total de transactions de dette
            supplies: data.supplies.length,
            withdraws: data.withdraws.length,
            others: data.others.length,
            total: data.debt.length + data.supplies.length + data.withdraws.length + data.others.length
          };
        });

        // Calculer les intérêts pour chaque stablecoin
        const interestCalculations = {};
        for (const stablecoin of Object.keys(transactionsByStablecoin)) {
          try {
            // Utiliser le nouveau tableau debt déjà trié chronologiquement, plus les autres types de transactions
            const allTokenTransactions = [
              ...transactionsByStablecoin[stablecoin].debt.map(tx => ({ ...tx, transactionType: tx.type })),
              ...transactionsByStablecoin[stablecoin].supplies.map(tx => ({ ...tx, transactionType: 'supply' })),
              ...transactionsByStablecoin[stablecoin].withdraws.map(tx => ({ ...tx, transactionType: 'withdraw' })),
              ...transactionsByStablecoin[stablecoin].others
            ];

            if (allTokenTransactions.length > 0) {
              console.log(`💰 Calcul des intérêts pour ${stablecoin} (${allTokenTransactions.length} transactions)`);
              const interestResult = await calculateInterestForToken(allTokenTransactions, stablecoin);
              interestCalculations[stablecoin] = interestResult;
            } else {
              console.log(`💰 Aucune transaction pour ${stablecoin}, pas de calcul d'intérêts`);
              interestCalculations[stablecoin] = {
                token: stablecoin,
                borrow: { totalInterest: "0", summary: { totalBorrows: "0", totalRepays: "0", currentDebt: "0", totalInterest: "0" } },
                supply: { totalInterest: "0", summary: { totalSupplies: "0", totalWithdraws: "0", currentSupply: "0", totalInterest: "0" } },
                summary: { totalBorrowInterest: "0", totalSupplyInterest: "0", netInterest: "0" }
              };
            }
          } catch (error) {
            console.error(`Erreur lors du calcul des intérêts pour ${stablecoin}:`, error);
            interestCalculations[stablecoin] = {
              token: stablecoin,
              error: error.message,
              borrow: { totalInterest: "0", summary: { totalBorrows: "0", totalRepays: "0", currentDebt: "0", totalInterest: "0" } },
              supply: { totalInterest: "0", summary: { totalSupplies: "0", totalWithdraws: "0", currentSupply: "0", totalInterest: "0" } },
              summary: { totalBorrowInterest: "0", totalSupplyInterest: "0", netInterest: "0" }
            };
          }
        }

        results.push({ 
          address, 
          success: true, 
          data: {
            address,
            transactions: transactionsByStablecoin,
            interests: interestCalculations,
            summary: {
              totalTransactions: allTransactions.total,
              stablecoins: Object.keys(transactionsByStablecoin).map(stablecoin => ({
                symbol: stablecoin,
                ...transactionsByStablecoin[stablecoin].summary,
                interests: interestCalculations[stablecoin]?.summary || { totalBorrowInterest: "0", totalSupplyInterest: "0", netInterest: "0" }
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