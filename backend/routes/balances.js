const express = require('express');
const router = express.Router();

// Configuration GnosisScan
const GNOSISSCAN_API_KEY = process.env.GNOSISSCAN_API_KEY || '';
const GNOSISSCAN_BASE_URL = 'https://api.gnosisscan.io/api';

// Adresses des tokens V3 depuis constants.js
const TOKENS_V3 = {
  armmUSDC: {
    address: '0xed56f76e9cbc6a64b821e9c016eafbd3db5436d1',
    symbol: 'armmUSDC',
    decimals: 6
  },
  armmWXDAI: {
    address: '0x0ca4f5554dd9da6217d62d8df2816c82bba4157b',
    symbol: 'armmWXDAI',
    decimals: 18
  },
  debtUSDC: {
    address: '0x69c731aE5f5356a779f44C355aBB685d84e5E9e6',
    symbol: 'debtUSDC',
    decimals: 6
  },
  debtWXDAI: {
    address: '0x9908801dF7902675C3FEDD6Fea0294D18D5d5d34',
    symbol: 'debtWXDAI',
    decimals: 18
  }
};

/**
 * Fonction pour récupérer les balances des tokens V3 via GnosisScan
 */
async function fetchTokenBalancesV3(userAddress) {
  try {
    // Fonction pour ajouter un délai
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Récupérer les balances une par une avec un délai pour éviter le rate limit
    const balances = {};
    
    for (const [key, token] of Object.entries(TOKENS_V3)) {
      try {
        const url = `${GNOSISSCAN_BASE_URL}?module=account&action=tokenbalance&contractaddress=${token.address}&address=${userAddress}&tag=latest&apikey=${GNOSISSCAN_API_KEY}`;
        
        const response = await fetch(url);
        
        // Vérifier si la réponse est OK
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const responseText = await response.text();
        
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          throw new Error(`Réponse non-JSON reçue`);
        }
        
        balances[key] = {
          token: token.address,
          symbol: token.symbol,
          balance: data.result || '0',
          decimals: token.decimals,
          formatted: formatTokenAmount(data.result || '0', token.decimals)
        };
        
        // Délai de 1 seconde entre chaque requête pour éviter le rate limit
        if (key !== Object.keys(TOKENS_V3)[Object.keys(TOKENS_V3).length - 1]) {
          await delay(1000);
        }
        
      } catch (error) {
        balances[key] = {
          token: token.address,
          symbol: token.symbol,
          balance: '0',
          decimals: token.decimals,
          formatted: '0.00'
        };
      }
    }
    
    return balances;

  } catch (error) {
    // Retourner des balances à 0 en cas d'erreur
    const fallbackBalances = {};
    Object.entries(TOKENS_V3).forEach(([key, token]) => {
      fallbackBalances[key] = {
        token: token.address,
        symbol: token.symbol,
        balance: '0',
        decimals: token.decimals,
        formatted: '0.00'
      };
    });
    
    return fallbackBalances;
  }
}

/**
 * @route GET /api/balance/v3/:address
 * @desc Récupérer les balances des tokens V3 pour une adresse
 * @access Public
 */
router.get('/v3/:address', async (req, res) => {
  try {
    const { address } = req.params;

    // Validation de l'adresse Ethereum
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Adresse invalide',
        message: 'L\'adresse doit être une adresse Ethereum valide (0x...)',
        received: address
      });
    }

    // Récupérer les balances V3
    const balances = await fetchTokenBalancesV3(address);

    res.json({
      success: true,
      data: {
        address,
        balances,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Erreur dans /api/balance/v3:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des balances',
      message: error.message
    });
  }
});

/**
 * @route POST /api/balance/v3/batch
 * @desc Récupérer les balances des tokens V3 pour plusieurs adresses
 * @access Public
 */
router.post('/v3/batch', async (req, res) => {
  try {
    const { addresses } = req.body;

    // Validation des adresses
    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Adresses invalides',
        message: 'Le paramètre "addresses" doit être un tableau non vide'
      });
    }

    // Validation de chaque adresse
    for (const address of addresses) {
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return res.status(400).json({
          success: false,
          error: 'Adresse invalide',
          message: `L'adresse ${address} n'est pas une adresse Ethereum valide`,
          invalidAddress: address
        });
      }
    }

    // Récupérer les balances pour toutes les adresses en parallèle
    const results = await Promise.all(
      addresses.map(async (address) => {
        const balances = await fetchTokenBalancesV3(address);
        return {
          address,
          balances
        };
      })
    );

    res.json({
      success: true,
      data: {
        addresses: results,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Erreur dans /api/balance/v3/batch:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des balances en batch',
      message: error.message
    });
  }
});

// Fonction utilitaire pour formater les montants
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

module.exports = router; 