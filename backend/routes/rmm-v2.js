const express = require('express');
const router = express.Router();

// Importer le service TheGraph V2
const { calculateInterestForV2FromTheGraph } = require('../services/thegraph-interest-calculator-v2');

/**
 * @route GET /api/rmm/v2/:address1/:address2?/:address3?
 * @desc Endpoint V2 qui utilise TheGraph pour récupérer les données (WXDAI uniquement)
 * @access Public
 */
router.get('/:address1/:address2?/:address3?', async (req, res) => {
  const requestTimer = req.startTimer('rmm_v2_endpoint');
  
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

    req.logEvent('rmm_v2_started', { 
      addresses, 
      count: addresses.length 
    });

    const results = [];
    for (const address of addresses) {
      const addressTimer = req.startTimer(`address_${address}`);
      
      try {
        req.logEvent('processing_address_v2', { address });
        
        // Utiliser directement TheGraph V2 pour récupérer les intérêts
        const interestResult = await calculateInterestForV2FromTheGraph(address, req);

        // Convertir le format pour compatibilité frontend
        const frontendCompatibleData = {
          address,
          contract: '0x7bb834017672b1135466661d8dd69c5dd0b3bf51', // Contract V2
          subgraphUrl: 'https://api.thegraph.com/subgraphs/id/QmXT8Cpkjevu2sPN1fKkwb7Px9Wqj84DALA2TQ8nokhj7e',
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
          // Format V2 compatible (pour rétrocompatibilité)
          stats: {
            USDC: { debt: 0, supply: 0, total: 0 }, // V2: pas d'USDC
            WXDAI: { 
              debt: interestResult.borrow.dailyDetails.filter(d => d.transactionType === 'borrow' || d.transactionType === 'repay').length,
              supply: interestResult.supply.dailyDetails.filter(d => d.transactionType === 'supply' || d.transactionType === 'withdraw').length,
              total: interestResult.borrow.dailyDetails.length + interestResult.supply.dailyDetails.length
            }
          },
          totals: {
            USDC: { debt: 0, supply: 0 }, // V2: pas d'USDC
            WXDAI: { 
              // Utiliser l'historique complet, pas seulement l'état final
              debt: Math.max(...interestResult.borrow.dailyDetails.map(d => parseFloat(d.debt || '0') / Math.pow(10, 18))),
              supply: Math.max(...interestResult.supply.dailyDetails.map(d => parseFloat(d.supply || '0') / Math.pow(10, 18)))
            }
          },
          transactions: {
            USDC: { debt: [], supply: [] }, // V2: pas d'USDC
            WXDAI: {
              debt: interestResult.borrow.dailyDetails
                .filter(d => d.transactionType === 'borrow' || d.transactionType === 'repay')
                .map(d => ({
                  txHash: `v2_${d.timestamp}_${d.transactionType}`,
                  amount: d.transactionAmount || '0',
                  amountFormatted: parseFloat(d.transactionAmount || '0') / Math.pow(10, 18), // Convertir wei → WXDAI
                  timestamp: d.timestamp,
                  type: d.transactionType === 'borrow' ? 'borrow' : 'repay',
                  reserve: 'rmmWXDAI'
                })),
              supply: interestResult.supply.dailyDetails
                .filter(d => d.transactionType === 'supply' || d.transactionType === 'withdraw')
                .map(d => ({
                  txHash: `v2_${d.timestamp}_${d.transactionType}`,
                  amount: d.transactionAmount || '0',
                  amountFormatted: parseFloat(d.transactionAmount || '0') / Math.pow(10, 18), // Convertir wei → WXDAI
                  timestamp: d.timestamp,
                  type: d.transactionType === 'supply' ? 'deposit' : 'withdraw',
                  reserve: 'rmmWXDAI'
                }))
            }
          },
          timestamp: new Date().toISOString()
        };

        req.stopTimer(`address_${address}`);
        req.logEvent('address_v2_processed_successfully', { 
          address, 
          token: interestResult.token
        });

        results.push({ 
          address, 
          success: true, 
          data: {
            address,
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
            // Garder aussi l'ancien format pour compatibilité
            transactions: frontendCompatibleData.transactions,
            summary: {
              stablecoins: [{
                symbol: 'WXDAI',
                interests: {
                  totalBorrowInterest: interestResult.borrow.totalInterest,
                  totalSupplyInterest: interestResult.supply.totalInterest,
                  netInterest: (BigInt(interestResult.supply.totalInterest) - BigInt(interestResult.borrow.totalInterest)).toString()
                }
              }]
            }
          }
        });
      } catch (error) {
        req.stopTimer(`address_${address}`);
        req.logEvent('address_v2_processing_error', { 
          address, 
          error: error.message 
        });
        
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

    req.stopTimer('rmm_v2_endpoint');
    req.logEvent('rmm_v2_completed', { 
      totalAddresses: addresses.length,
      successful: successfulResults.length,
      failed: failedResults.length
    });

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
    req.stopTimer('rmm_v2_endpoint');
    req.logEvent('rmm_v2_error', { 
      error: error.message 
    });
    
    console.error('Erreur dans /api/rmm/v2:', error);
    res.status(500).json({
      error: 'Erreur lors du traitement des adresses V2',
      message: error.message
    });
  }
});

module.exports = router; 