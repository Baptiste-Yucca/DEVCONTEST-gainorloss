const express = require('express');
const router = express.Router();

// Configuration GnosisScan
const GNOSISSCAN_API_KEY = process.env.GNOSISSCAN_API_KEY || '';
const GNOSISSCAN_BASE_URL = 'https://api.gnosisscan.io/api';

// Configuration RPC Gnosis
const GNOSIS_RPC_URL = 'https://rpc.gnosischain.com/';

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
 * Fonction pour récupérer les balances via RPC Gnosis avec multicall
 * Plus rapide et plus efficace que l'API GnosisScan
 */
async function fetchTokenBalancesRPC(userAddress) {
  try {
    console.log(`🚀 Récupération RPC des balances pour ${userAddress}`);
    
    // Préparer les appels balanceOf pour tous les tokens
    const calls = Object.entries(TOKENS_V3).map(([key, token], index) => ({
      jsonrpc: "2.0",
      id: index + 1,
      method: "eth_call",
      params: [
        {
          to: token.address,
          data: `0x70a08231000000000000000000000000${userAddress.toLowerCase().slice(2)}` // balanceOf(address)
        },
        "latest"
      ]
    }));
    
    console.log(`📡 Multicall RPC: ${calls.length} tokens`);
    
    const startTime = Date.now();
    const response = await fetch(GNOSIS_RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(calls)
    });
    const responseTime = Date.now() - startTime;
    
    console.log(`⏱️ Temps de réponse RPC: ${responseTime}ms`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      throw new Error('Réponse RPC invalide');
    }
    
    // Traiter les résultats
    const balances = {};
    Object.entries(TOKENS_V3).forEach(([key, token], index) => {
      const result = data[index];
      
      if (result && result.result) {
        // Convertir l'hex en décimal
        const hexBalance = result.result;
        const decimalBalance = parseInt(hexBalance, 16).toString();
        
        balances[key] = {
          token: token.address,
          symbol: token.symbol,
          balance: decimalBalance,
          decimals: token.decimals,
          formatted: formatTokenAmount(decimalBalance, token.decimals)
        };
      } else {
        // Fallback en cas d'erreur
        balances[key] = {
          token: token.address,
          symbol: token.symbol,
          balance: '0',
          decimals: token.decimals,
          formatted: '0.00'
        };
      }
    });
    
    console.log(`✅ Balances RPC récupérées en ${responseTime}ms`);
    return balances;

  } catch (error) {
    console.error(`❌ Erreur lors de la récupération RPC des balances:`, error);
    
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
 * Fonction pour récupérer les balances via l'API V2 d'Etherscan/GnosisScan
 * Plus moderne et plus rapide que l'API V1
 */
async function fetchTokenBalancesV2(userAddress) {
  try {
    console.log(`🚀 Récupération V2 des balances pour ${userAddress}`);
    
    // URL pour l'API V2 - plus moderne et plus rapide
    const url = `${GNOSISSCAN_BASE_URL}?module=account&action=tokenbalance&contractaddress=${Object.values(TOKENS_V3).map(token => token.address).join(',')}&address=${userAddress}&tag=latest&apikey=${GNOSISSCAN_API_KEY}`;
    
    console.log(`📡 Appel GnosisScan V2: ${url.substring(0, 100)}...`);
    
    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RMMGain/1.0'
      }
    });
    const responseTime = Date.now() - startTime;
    
    console.log(`⏱️ Temps de réponse GnosisScan V2: ${responseTime}ms`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status !== '1') {
      throw new Error(`API Error: ${data.message || 'Unknown error'}`);
    }
    
    // Traiter la réponse V2
    const balances = {};
    const results = Array.isArray(data.result) ? data.result : [data.result];
    
    Object.entries(TOKENS_V3).forEach(([key, token], index) => {
      const result = results[index] || '0';
      
      balances[key] = {
        token: token.address,
        symbol: token.symbol,
        balance: result,
        decimals: token.decimals,
        formatted: formatTokenAmount(result, token.decimals)
      };
    });
    
    console.log(`✅ Balances V2 récupérées en ${responseTime}ms`);
    return balances;

  } catch (error) {
    console.error(`❌ Erreur lors de la récupération V2 des balances:`, error);
    
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
 * Fonction optimisée pour récupérer les balances des tokens V3 via GnosisScan
 * Utilise un seul appel API au lieu de 4 appels séquentiels
 */
async function fetchTokenBalancesV3Optimized(userAddress) {
  try {
    console.log(`🚀 Récupération optimisée des balances pour ${userAddress}`);
    
    // Créer les paramètres pour un seul appel
    const tokenAddresses = Object.values(TOKENS_V3).map(token => token.address);
    const contractAddresses = tokenAddresses.join(',');
    
    // URL pour récupérer toutes les balances en une seule requête
    const url = `${GNOSISSCAN_BASE_URL}?module=account&action=tokenbalance&contractaddress=${contractAddresses}&address=${userAddress}&tag=latest&apikey=${GNOSISSCAN_API_KEY}`;
    
    console.log(`📡 Appel GnosisScan: ${url.substring(0, 100)}...`);
    
    const startTime = Date.now();
    const response = await fetch(url);
    const responseTime = Date.now() - startTime;
    
    console.log(`⏱️ Temps de réponse GnosisScan: ${responseTime}ms`);
    
    // Vérifier si la réponse est OK
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const responseText = await response.text();
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Réponse non-JSON reçue: ${responseText.substring(0, 100)}`);
    }
    
    // Traiter la réponse
    const balances = {};
    const results = Array.isArray(data.result) ? data.result : [data.result];
    
    Object.entries(TOKENS_V3).forEach(([key, token], index) => {
      const result = results[index] || '0';
      
      balances[key] = {
        token: token.address,
        symbol: token.symbol,
        balance: result,
        decimals: token.decimals,
        formatted: formatTokenAmount(result, token.decimals)
      };
    });
    
    console.log(`✅ Balances récupérées en ${responseTime}ms`);
    return balances;

  } catch (error) {
    console.error(`❌ Erreur lors de la récupération des balances:`, error);
    
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
 * @route GET /api/balance/rpc/:address
 * @desc Récupérer les balances des tokens via RPC Gnosis (multicall)
 * @access Public
 */
router.get('/rpc/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const startTime = Date.now();

    // Validation de l'adresse Ethereum
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Adresse invalide',
        message: 'L\'adresse doit être une adresse Ethereum valide (0x...)',
        received: address
      });
    }

    console.log(`🔍 Récupération des balances RPC pour: ${address}`);

    // Récupérer les balances via RPC
    const balances = await fetchTokenBalancesRPC(address);
    
    const totalTime = Date.now() - startTime;
    console.log(`⏱️ Total temps de traitement RPC: ${totalTime}ms`);

    res.json({
      success: true,
      data: {
        address,
        balances,
        api_version: 'rpc',
        method: 'multicall',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Erreur dans /api/balance/rpc:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des balances RPC',
      message: error.message
    });
  }
});

/**
 * @route GET /api/balance/v2/:address
 * @desc Récupérer les balances des tokens via l'API V2 d'Etherscan/GnosisScan
 * @access Public
 */
router.get('/v2/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const startTime = Date.now();

    // Validation de l'adresse Ethereum
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Adresse invalide',
        message: 'L\'adresse doit être une adresse Ethereum valide (0x...)',
        received: address
      });
    }

    console.log(`🔍 Récupération des balances V2 pour: ${address}`);

    // Récupérer les balances V2
    const balances = await fetchTokenBalancesV2(address);
    
    const totalTime = Date.now() - startTime;
    console.log(`⏱️ Total temps de traitement V2: ${totalTime}ms`);

    res.json({
      success: true,
      data: {
        address,
        balances,
        api_version: 'v2',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Erreur dans /api/balance/v2:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des balances V2',
      message: error.message
    });
  }
});

/**
 * @route GET /api/balance/v3/:address
 * @desc Récupérer les balances des tokens V3 pour une adresse
 * @access Public
 */
router.get('/v3/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const startTime = Date.now();

    // Validation de l'adresse Ethereum
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Adresse invalide',
        message: 'L\'adresse doit être une adresse Ethereum valide (0x...)',
        received: address
      });
    }

    console.log(`🔍 Récupération des balances V3 pour: ${address}`);

    // Récupérer les balances V3 optimisées
    const balances = await fetchTokenBalancesV3Optimized(address);
    
    const totalTime = Date.now() - startTime;
    console.log(`⏱️ Total temps de traitement: ${totalTime}ms`);

    res.json({
      success: true,
      data: {
        address,
        balances,
        api_version: 'v3',
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
        const balances = await fetchTokenBalancesV3Optimized(address);
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