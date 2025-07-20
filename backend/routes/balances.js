const express = require('express');
const router = express.Router();
const { fetchTokenBalances } = require('../services/gnosisscan');

/**
 * @route GET /api/balances/:address
 * @desc Récupérer les soldes des tokens pour une adresse
 * @access Public
 */
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;

    // Validation de l'adresse Ethereum
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        error: 'Adresse invalide',
        message: 'L\'adresse doit être une adresse Ethereum valide (0x...)',
        received: address
      });
    }

    console.log(`API /balances: Requête pour ${address}`);

    // Récupérer les soldes
    const balances = await fetchTokenBalances(address);

    console.log(`API /balances: Soldes récupérés pour ${address}`);

    res.json({
      success: true,
      data: {
        address,
        balances,
        summary: {
          totalSupply: calculateTotalSupply(balances),
          totalDebt: calculateTotalDebt(balances),
          netPosition: calculateNetPosition(balances)
        }
      }
    });

  } catch (error) {
    console.error('Erreur dans /api/balances:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des soldes',
      message: error.message
    });
  }
});

/**
 * @route GET /api/balances/:address/tokens
 * @desc Récupérer les soldes détaillés par token
 * @access Public
 */
router.get('/:address/tokens', async (req, res) => {
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

    // Récupérer les soldes
    const balances = await fetchTokenBalances(address);

    // Formater les données par token
    const tokenDetails = [
      {
        symbol: 'USDC',
        name: 'USD Coin',
        supply: {
          token: 'armmUSDC',
          balance: balances.armmUSDC,
          formatted: formatTokenAmount(balances.armmUSDC, 6)
        },
        debt: {
          token: 'debtUSDC',
          balance: balances.debtUSDC,
          formatted: formatTokenAmount(balances.debtUSDC, 6)
        }
      },
      {
        symbol: 'WXDAI',
        name: 'Wrapped XDAI',
        supply: {
          token: 'armmWXDAI',
          balance: balances.armmWXDAI,
          formatted: formatTokenAmount(balances.armmWXDAI, 18)
        },
        debt: {
          token: 'debtWXDAI',
          balance: balances.debtWXDAI,
          formatted: formatTokenAmount(balances.debtWXDAI, 18)
        }
      }
    ];

    res.json({
      success: true,
      data: {
        address,
        tokens: tokenDetails,
        summary: {
          totalSupplyUSD: calculateTotalSupplyUSD(tokenDetails),
          totalDebtUSD: calculateTotalDebtUSD(tokenDetails),
          netPositionUSD: calculateNetPositionUSD(tokenDetails)
        }
      }
    });

  } catch (error) {
    console.error('Erreur dans /api/balances/tokens:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des détails des tokens',
      message: error.message
    });
  }
});

// Fonctions utilitaires
function formatTokenAmount(amount, decimals) {
  if (!amount || amount === '0') return '0.00';
  
  try {
    const amountBigInt = BigInt(amount);
    const divisor = BigInt(10 ** decimals);
    const integerPart = amountBigInt / divisor;
    const fractionalPart = amountBigInt % divisor;
    
    let fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    fractionalStr = fractionalStr.substring(0, 2).padEnd(2, '0');
    
    return `${integerPart}.${fractionalStr}`;
  } catch (error) {
    return '0.00';
  }
}

function calculateTotalSupply(balances) {
  return {
    armmUSDC: balances.armmUSDC,
    armmWXDAI: balances.armmWXDAI
  };
}

function calculateTotalDebt(balances) {
  return {
    debtUSDC: balances.debtUSDC,
    debtWXDAI: balances.debtWXDAI
  };
}

function calculateNetPosition(balances) {
  return {
    USDC: parseFloat(formatTokenAmount(balances.armmUSDC, 6)) - parseFloat(formatTokenAmount(balances.debtUSDC, 6)),
    WXDAI: parseFloat(formatTokenAmount(balances.armmWXDAI, 18)) - parseFloat(formatTokenAmount(balances.debtWXDAI, 18))
  };
}

function calculateTotalSupplyUSD(tokenDetails) {
  return tokenDetails.reduce((sum, token) => {
    return sum + parseFloat(token.supply.formatted);
  }, 0);
}

function calculateTotalDebtUSD(tokenDetails) {
  return tokenDetails.reduce((sum, token) => {
    return sum + parseFloat(token.debt.formatted);
  }, 0);
}

function calculateNetPositionUSD(tokenDetails) {
  return calculateTotalSupplyUSD(tokenDetails) - calculateTotalDebtUSD(tokenDetails);
}

module.exports = router; 