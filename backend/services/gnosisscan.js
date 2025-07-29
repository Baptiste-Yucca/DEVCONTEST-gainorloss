const fetch = require('node-fetch');

// Configuration Gnosisscan
const GNOSISSCAN_API_URL = 'https://api.gnosisscan.io/api';
const API_KEY = process.env.GNOSISSCAN_API_KEY;

// Import depuis les constantes centralisées
const { TOKENS, getSupplyTokenAddresses } = require('../../utils/constants.js');

/**
 * Récupère le solde d'un token pour une adresse
 */
async function fetchTokenBalance(address, tokenAddress, req = null) {
  const timerName = req ? req.startTimer(`gnosisscan_balance_${tokenAddress}`) : null;
  
  try {
    const url = `${GNOSISSCAN_API_URL}?module=account&action=tokenbalance&contractaddress=${tokenAddress}&address=${address}&tag=latest`;
    
    const params = new URLSearchParams({
      module: 'account',
      action: 'tokenbalance',
      contractaddress: tokenAddress,
      address: address,
      tag: 'latest'
    });
    
    if (API_KEY) {
      params.append('apikey', API_KEY);
    }
    
    const response = await fetch(`${GNOSISSCAN_API_URL}?${params}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status === '1') {
      if (req) {
        req.stopTimer(`gnosisscan_balance_${tokenAddress}`);
        req.logEvent('gnosisscan_balance_completed', { 
          address, 
          tokenAddress, 
          balance: data.result 
        });
      }
      return data.result;
    } else {
      throw new Error(`Erreur API Gnosisscan: ${data.message}`);
    }
    
  } catch (error) {
    if (req) {
      req.stopTimer(`gnosisscan_balance_${tokenAddress}`);
      req.logEvent('gnosisscan_balance_error', { 
        address, 
        tokenAddress, 
        error: error.message 
      });
    }
    
    console.error(`Erreur lors de la récupération du solde ${tokenAddress}:`, error);
    return '0'; // Retourner 0 en cas d'erreur
  }
}

/**
 * Récupère tous les soldes des tokens RMM pour une adresse
 */
async function fetchTokenBalances(address, req = null) {
  const timerName = req ? req.startTimer('gnosisscan_all_balances') : null;
  
  try {
    console.log(`Gnosisscan: Récupération des soldes pour ${address}`);
    
    // Obtenir toutes les adresses des tokens
    const allTokenAddresses = {
      USDC: TOKENS.USDC.address,
      WXDAI: TOKENS.WXDAI.address,
      armmUSDC: TOKENS.USDC.supplyAddress,
      armmWXDAI: TOKENS.WXDAI.supplyAddress,
      debtUSDC: TOKENS.USDC.debtAddress,
      debtWXDAI: TOKENS.WXDAI.debtAddress
    };
    
    // Récupérer tous les soldes en parallèle
    const balancePromises = Object.entries(allTokenAddresses).map(async ([tokenName, tokenAddress]) => {
      const balance = await fetchTokenBalance(address, tokenAddress, req);
      return [tokenName, balance];
    });
    
    const results = await Promise.all(balancePromises);
    
    // Convertir en objet
    const balances = Object.fromEntries(results);
    
    if (req) {
      req.stopTimer('gnosisscan_all_balances');
      req.logEvent('gnosisscan_all_balances_completed', { 
        address, 
        balances 
      });
    }
    
    console.log(`Gnosisscan: Soldes récupérés pour ${address}:`, {
      armmUSDC: balances.armmUSDC,
      armmWXDAI: balances.armmWXDAI,
      debtUSDC: balances.debtUSDC,
      debtWXDAI: balances.debtWXDAI
    });
    
    return balances;
    
  } catch (error) {
    if (req) {
      req.stopTimer('gnosisscan_all_balances');
      req.logEvent('gnosisscan_all_balances_error', { 
        address, 
        error: error.message 
      });
    }
    
    console.error('Erreur lors de la récupération des soldes:', error);
    throw new Error(`Erreur lors de la récupération des soldes: ${error.message}`);
  }
}

/**
 * Récupère les informations détaillées d'un token
 */
async function fetchTokenInfo(tokenAddress) {
  try {
    const params = new URLSearchParams({
      module: 'contract',
      action: 'getabi',
      address: tokenAddress
    });
    
    if (API_KEY) {
      params.append('apikey', API_KEY);
    }
    
    const response = await fetch(`${GNOSISSCAN_API_URL}?${params}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status === '1') {
      return {
        address: tokenAddress,
        abi: data.result
      };
    } else {
      throw new Error(`Erreur API Gnosisscan: ${data.message}`);
    }
    
  } catch (error) {
    console.error(`Erreur lors de la récupération des infos du token ${tokenAddress}:`, error);
    return null;
  }
}

/**
 * Récupère les transactions d'une adresse
 */
async function fetchAddressTransactions(address, startBlock = 0, endBlock = 99999999) {
  try {
    const params = new URLSearchParams({
      module: 'account',
      action: 'txlist',
      address: address,
      startblock: startBlock,
      endblock: endBlock,
      sort: 'desc'
    });
    
    if (API_KEY) {
      params.append('apikey', API_KEY);
    }
    
    const response = await fetch(`${GNOSISSCAN_API_URL}?${params}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status === '1') {
      return data.result;
    } else {
      throw new Error(`Erreur API Gnosisscan: ${data.message}`);
    }
    
  } catch (error) {
    console.error(`Erreur lors de la récupération des transactions pour ${address}:`, error);
    return [];
  }
}

/**
 * Récupère les transactions de transfert des tokens de supply pour une adresse
 */
async function fetchTokenTransfers(userAddress, existingTxHashes = [], req = null) {
  const timerName = req ? req.startTimer('gnosisscan_token_transfers') : null;
  
  try {
    console.log(`🔄 Récupération des transferts de tokens pour ${userAddress}`);
    
    const existingHashSet = new Set(existingTxHashes);
    const allTransfers = [];
    
    // Récupérer les transferts pour armmUSDC et armmWXDAI
    const supplyTokenAddresses = getSupplyTokenAddresses();
    for (const [tokenSymbol, contractAddress] of Object.entries(supplyTokenAddresses)) {
      
      const tokenTimerName = req ? req.startTimer(`gnosisscan_transfers_${tokenSymbol}`) : null;
      
      console.log(`📊 Récupération des transferts ${tokenSymbol}...`);
      
      const params = new URLSearchParams({
        module: 'account',
        action: 'tokentx',
        contractaddress: contractAddress,
        address: userAddress,
        page: 1,
        offset: 10000,
        sort: 'asc'
      });
      
      if (API_KEY) {
        params.append('apikey', API_KEY);
      }
      
      const response = await fetch(`${GNOSISSCAN_API_URL}?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.status === '1' && data.result) {
        // Filtrer les transactions déjà récupérées par TheGraph
        const newTransfers = data.result.filter(tx => !existingHashSet.has(tx.hash));
        
        // Grouper par hash pour gérer les doublons (même tx avec from différents)
        const transfersByHash = new Map();
        newTransfers.forEach(tx => {
          const hash = tx.hash;
          if (!transfersByHash.has(hash)) {
            transfersByHash.set(hash, []);
          }
          transfersByHash.get(hash).push(tx);
        });
        
        // Transformer les données en choisissant la meilleure transaction par hash
        const transformedTransfers = Array.from(transfersByHash.values()).map(txGroup => {
          // Priorité : prendre la transaction avec from != adresse nulle
          const bestTx = txGroup.find(tx => tx.from !== '0x0000000000000000000000000000000000000000') || txGroup[0];
          
          // Déterminer la direction du transfert
          const isIncoming = bestTx.to.toLowerCase() === userAddress.toLowerCase();
          const transfer = isIncoming ? 'in' : 'out';
          
          // Simplifier le nom de la fonction
          let simplifiedFunction = null;
          if (bestTx.functionName) {
            const match = bestTx.functionName.match(/^([^(]+)/);
            simplifiedFunction = match ? match[1] : bestTx.functionName;
          }
          
          return {
            timestamp: parseInt(bestTx.timeStamp),
            hash: bestTx.hash,
            from: bestTx.from,
            to: bestTx.to,
            value: bestTx.value,
            tokenSymbol: bestTx.tokenSymbol, // Temporaire pour le tri
            contractAddress: bestTx.contractAddress,
            functionName: simplifiedFunction,
            transfer
          };
        });
        
        allTransfers.push(...transformedTransfers);
        
        if (req) {
          req.stopTimer(`gnosisscan_transfers_${tokenSymbol}`);
          req.logEvent('gnosisscan_transfers_token_completed', { 
            tokenSymbol, 
            count: transformedTransfers.length 
          });
        }
        
        console.log(`📊 ${transformedTransfers.length} nouveaux transferts ${tokenSymbol} récupérés`);
      }
      
      // Attendre 200ms entre les requêtes pour respecter les limites d'API
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Séparer les transactions par type et retirer tokenSymbol
    const usdcTransfers = allTransfers
      .filter(tx => tx.tokenSymbol.includes('USDC'))
      .map(tx => {
        const { tokenSymbol, ...txWithoutSymbol } = tx;
        return txWithoutSymbol;
      });
    
    const wxdaiTransfers = allTransfers
      .filter(tx => tx.tokenSymbol.includes('WXDAI'))
      .map(tx => {
        const { tokenSymbol, ...txWithoutSymbol } = tx;
        return txWithoutSymbol;
      });
    
    const otherTransfers = allTransfers
      .filter(tx => !tx.tokenSymbol.includes('USDC') && !tx.tokenSymbol.includes('WXDAI'))
      .map(tx => {
        const { tokenSymbol, ...txWithoutSymbol } = tx;
        return txWithoutSymbol;
      });
    
    if (req) {
      req.stopTimer('gnosisscan_token_transfers');
      req.logEvent('gnosisscan_token_transfers_completed', { 
        address: userAddress,
        usdc: usdcTransfers.length,
        wxdai: wxdaiTransfers.length,
        others: otherTransfers.length,
        total: allTransfers.length
      });
    }
    
    console.log(`✅ Total: ${usdcTransfers.length} USDC, ${wxdaiTransfers.length} WXDAI, ${otherTransfers.length} autres`);
    
    return {
      usdc: usdcTransfers,
      armmwxdai: wxdaiTransfers,
      others: otherTransfers,
      total: allTransfers.length
    };
    
  } catch (error) {
    if (req) {
      req.stopTimer('gnosisscan_token_transfers');
      req.logEvent('gnosisscan_token_transfers_error', { 
        address: userAddress, 
        error: error.message 
      });
    }
    
    console.error(`Erreur lors de la récupération des transferts de tokens:`, error);
    return {
      usdcWxdai: [],
      others: [],
      total: 0
    };
  }
}

module.exports = {
  fetchTokenBalances,
  fetchTokenBalance,
  fetchTokenInfo,
  fetchAddressTransactions,
  fetchTokenTransfers
}; 