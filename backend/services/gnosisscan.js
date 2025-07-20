const fetch = require('node-fetch');

// Configuration Gnosisscan
const GNOSISSCAN_API_URL = 'https://api.gnosisscan.io/api';
const API_KEY = process.env.GNOSISSCAN_API_KEY;

// Adresses des tokens RMM
const TOKEN_ADDRESSES = {
  armmUSDC: '0xddafbb505ad214d7b80b1f830fccc89b60fb7a83',
  armmWXDAI: '0xe91d153e0b41518a2ce8dd3d7944fa863463a97d',
  debtUSDC: '0xdaa06cf7adceb69fcfde68d896818b9938984a70',
  debtWXDAI: '0xdaa06cf7adceb69fcfde68d896818b9938984a70'
};

/**
 * Récupère le solde d'un token pour une adresse
 */
async function fetchTokenBalance(address, tokenAddress) {
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
      return data.result;
    } else {
      throw new Error(`Erreur API Gnosisscan: ${data.message}`);
    }
    
  } catch (error) {
    console.error(`Erreur lors de la récupération du solde ${tokenAddress}:`, error);
    return '0'; // Retourner 0 en cas d'erreur
  }
}

/**
 * Récupère tous les soldes des tokens RMM pour une adresse
 */
async function fetchTokenBalances(address) {
  try {
    console.log(`Gnosisscan: Récupération des soldes pour ${address}`);
    
    // Récupérer tous les soldes en parallèle
    const balancePromises = Object.entries(TOKEN_ADDRESSES).map(async ([tokenName, tokenAddress]) => {
      const balance = await fetchTokenBalance(address, tokenAddress);
      return [tokenName, balance];
    });
    
    const results = await Promise.all(balancePromises);
    
    // Convertir en objet
    const balances = Object.fromEntries(results);
    
    console.log(`Gnosisscan: Soldes récupérés pour ${address}:`, {
      armmUSDC: balances.armmUSDC,
      armmWXDAI: balances.armmWXDAI,
      debtUSDC: balances.debtUSDC,
      debtWXDAI: balances.debtWXDAI
    });
    
    return balances;
    
  } catch (error) {
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

module.exports = {
  fetchTokenBalances,
  fetchTokenBalance,
  fetchTokenInfo,
  fetchAddressTransactions,
  TOKEN_ADDRESSES
}; 