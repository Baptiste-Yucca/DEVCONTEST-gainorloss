const express = require('express');
const router = express.Router();
const { fetchBorrows, fetchSupplies, fetchWithdraws, fetchRepays } = require('../services/graphql');

/**
 * @route GET /api/transactions/:address
 * @desc Récupérer toutes les transactions d'une adresse
 * @access Public
 */
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { type } = req.query; // optionnel: supply, withdraw, borrow, repay

    // Validation de l'adresse Ethereum
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        error: 'Adresse invalide',
        message: 'L\'adresse doit être une adresse Ethereum valide (0x...)',
        received: address
      });
    }

    console.log(`API /transactions: Requête pour ${address}${type ? ` (type: ${type})` : ''}`);

    // Récupérer toutes les transactions
    const [borrows, supplies, withdraws, repays] = await Promise.all([
      fetchBorrows(address),
      fetchSupplies(address),
      fetchWithdraws(address),
      fetchRepays(address)
    ]);

    // Ajouter le type à chaque transaction
    const allTransactions = [
      ...supplies.map(tx => ({ ...tx, transactionType: 'supply' })),
      ...withdraws.map(tx => ({ ...tx, transactionType: 'withdraw' })),
      ...borrows.map(tx => ({ ...tx, transactionType: 'borrow' })),
      ...repays.map(tx => ({ ...tx, transactionType: 'repay' }))
    ];

    // Filtrer par type si spécifié
    let filteredTransactions = allTransactions;
    if (type && ['supply', 'withdraw', 'borrow', 'repay'].includes(type)) {
      filteredTransactions = allTransactions.filter(tx => tx.transactionType === type);
    }

    // Trier par date (plus récent en premier)
    filteredTransactions.sort((a, b) => b.timestamp - a.timestamp);

    // Statistiques
    const stats = {
      total: allTransactions.length,
      supply: supplies.length,
      withdraw: withdraws.length,
      borrow: borrows.length,
      repay: repays.length,
      filtered: filteredTransactions.length
    };

    console.log(`API /transactions: ${filteredTransactions.length} transactions trouvées pour ${address}`);

    res.json({
      success: true,
      data: {
        address,
        stats,
        transactions: filteredTransactions,
        summary: {
          totalAmount: calculateTotalAmount(filteredTransactions),
          dateRange: getDateRange(filteredTransactions)
        }
      }
    });

  } catch (error) {
    console.error('Erreur dans /api/transactions:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des transactions',
      message: error.message
    });
  }
});

/**
 * @route GET /api/transactions/:address/summary
 * @desc Obtenir un résumé des transactions d'une adresse
 * @access Public
 */
router.get('/:address/summary', async (req, res) => {
  try {
    const { address } = req.params;

    // Validation de l'adresse
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        error: 'Adresse invalide',
        message: 'L\'adresse doit être une adresse Ethereum valide (0x...)',
        received: address
      });
    }

    // Récupérer les transactions
    const [borrows, supplies, withdraws, repays] = await Promise.all([
      fetchBorrows(address),
      fetchSupplies(address),
      fetchWithdraws(address),
      fetchRepays(address)
    ]);

    // Calculer les totaux par token
    const tokenTotals = {};
    
    [...supplies, ...withdraws, ...borrows, ...repays].forEach(tx => {
      const tokenAddress = tx.reserve.id.substring(0, 42).toLowerCase();
      if (!tokenTotals[tokenAddress]) {
        tokenTotals[tokenAddress] = {
          supply: 0,
          withdraw: 0,
          borrow: 0,
          repay: 0
        };
      }
      
      const amount = parseFloat(tx.amount);
      if (supplies.includes(tx)) tokenTotals[tokenAddress].supply += amount;
      if (withdraws.includes(tx)) tokenTotals[tokenAddress].withdraw += amount;
      if (borrows.includes(tx)) tokenTotals[tokenAddress].borrow += amount;
      if (repays.includes(tx)) tokenTotals[tokenAddress].repay += amount;
    });

    res.json({
      success: true,
      data: {
        address,
        summary: {
          totalTransactions: supplies.length + withdraws.length + borrows.length + repays.length,
          byType: {
            supply: supplies.length,
            withdraw: withdraws.length,
            borrow: borrows.length,
            repay: repays.length
          },
          byToken: tokenTotals,
          dateRange: getDateRange([...supplies, ...withdraws, ...borrows, ...repays])
        }
      }
    });

  } catch (error) {
    console.error('Erreur dans /api/transactions/summary:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération du résumé',
      message: error.message
    });
  }
});

// Fonctions utilitaires
function calculateTotalAmount(transactions) {
  return transactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
}

function getDateRange(transactions) {
  if (transactions.length === 0) return null;
  
  const timestamps = transactions.map(tx => tx.timestamp);
  const minTimestamp = Math.min(...timestamps);
  const maxTimestamp = Math.max(...timestamps);
  
  return {
    start: new Date(minTimestamp * 1000).toISOString(),
    end: new Date(maxTimestamp * 1000).toISOString(),
    days: Math.ceil((maxTimestamp - minTimestamp) / (24 * 60 * 60))
  };
}

module.exports = router; 