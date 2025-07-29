const fetch = require('node-fetch');
const { fetchTokenTransfers: fetchGnosisScanTransfers } = require('./gnosisscan');

// Configuration Moralis
const MORALIS_API_URL = 'https://deep-index.moralis.io/api/v2';
const MORALIS_API_KEY = process.env.MORALIS_API_KEY;

// Import depuis les constantes centralisées
const { getSupplyTokenAddresses } = require('../../utils/constants.js');

/**
 * Vérifie si la clé API Moralis est configurée
 */
function isMoralisAvailable() {
  return !!MORALIS_API_KEY;
}

/**
 * Récupère les transferts de tokens via Moralis API
 */
async function fetchMoralisTokenTransfers(userAddress, tokenAddress, req = null) {
  const timerName = req ? req.startTimer(`moralis_transfers_${tokenAddress}`) : null;
  
  try {
    console.log(`🔄 Moralis: Récupération des transferts pour ${tokenAddress}`);
    
    const url = `${MORALIS_API_URL}/${userAddress}/erc20/transfers?chain=gnosis&token_addresses=${tokenAddress}`;
    
    const response = await fetch(url, {
      headers: {
        'X-API-Key': MORALIS_API_KEY,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    
    if (req) {
      req.stopTimer(`moralis_transfers_${tokenAddress}`);
      req.logEvent('moralis_transfers_completed', { 
        address: userAddress, 
        tokenAddress, 
        count: data.result?.length || 0 
      });
    }
    
    console.log(`📊 Moralis: ${data.result?.length || 0} transferts récupérés pour ${tokenAddress}`);
    
    return data.result || [];
    
  } catch (error) {
    if (req) {
      req.stopTimer(`moralis_transfers_${tokenAddress}`);
      req.logEvent('moralis_transfers_error', { 
        address: userAddress, 
        tokenAddress, 
        error: error.message 
      });
    }
    
    console.error(`❌ Erreur Moralis pour ${tokenAddress}:`, error.message);
    throw error;
  }
}

/**
 * Transforme les données Moralis au format attendu (conforme à GnosisScan)
 */
function transformMoralisTransfers(moralisData, tokenSymbol, userAddress) {
  return moralisData.map(tx => {
    // Déterminer la direction du transfert (comme dans GnosisScan)
    const isIncoming = tx.to_address.toLowerCase() === userAddress.toLowerCase();
    const transfer = isIncoming ? 'in' : 'out';
    
    // Convertir le timestamp ISO en timestamp Unix
    const timestamp = parseInt(new Date(tx.block_timestamp).getTime() / 1000);
    
    // Format conforme à GnosisScan
    return {
      timestamp: timestamp,
      hash: tx.transaction_hash,
      from: tx.from_address,
      to: tx.to_address,
      value: tx.value,
      contractAddress: tx.address, // Adresse du token dans Moralis
      functionName: null, // Moralis ne fournit pas le nom de fonction
      transfer
    };
  });
}

/**
 * Récupère les transferts de tokens avec fallback Moralis → GnosisScan
 */
async function fetchTokenTransfersWithFallback(userAddress, existingTxHashes = [], req = null) {
  const timerName = req ? req.startTimer('moralis_fallback_transfers') : null;
  
  try {
    console.log(`🔄 Récupération des transferts de tokens pour ${userAddress} (Moralis + fallback)`);
    
    const existingHashSet = new Set(existingTxHashes);
    const allTransfers = [];
    
    // Récupérer les adresses des tokens de supply
    const supplyTokenAddresses = getSupplyTokenAddresses();
    
    // Essayer Moralis d'abord
    if (isMoralisAvailable()) {
      console.log(`✅ Moralis disponible, tentative de récupération...`);
      
      for (const [tokenSymbol, contractAddress] of Object.entries(supplyTokenAddresses)) {
        try {
          const moralisData = await fetchMoralisTokenTransfers(userAddress, contractAddress, req);
          
          // Transformer les données Moralis
          const transformedTransfers = transformMoralisTransfers(moralisData, tokenSymbol, userAddress);
          
          // Filtrer les transactions déjà récupérées
          const newTransfers = transformedTransfers.filter(tx => !existingHashSet.has(tx.hash));
          
          allTransfers.push(...newTransfers);
          
          console.log(`📊 Moralis: ${newTransfers.length} nouveaux transferts ${tokenSymbol}`);
          
          // Délai entre les requêtes pour respecter les limites
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          console.warn(`⚠️ Moralis échoué pour ${tokenSymbol}, basculement vers GnosisScan...`);
          
          // Fallback vers GnosisScan pour ce token spécifique
          try {
            const params = new URLSearchParams({
              module: 'account',
              action: 'tokentx',
              contractaddress: contractAddress,
              address: userAddress,
              page: 1,
              offset: 10000,
              sort: 'asc'
            });
            
            if (process.env.GNOSISSCAN_API_KEY) {
              params.append('apikey', process.env.GNOSISSCAN_API_KEY);
            }
            
            const response = await fetch(`https://api.gnosisscan.io/api?${params}`);
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.status === '1' && data.result) {
              // Filtrer les transactions déjà récupérées
              const newTransfers = data.result.filter(tx => !existingHashSet.has(tx.hash));
              
              // Transformer au même format que Moralis
              const transformedTransfers = newTransfers.map(tx => {
                const isIncoming = tx.to.toLowerCase() === userAddress.toLowerCase();
                const transfer = isIncoming ? 'in' : 'out';
                
                return {
                  timestamp: parseInt(tx.timeStamp),
                  hash: tx.hash,
                  from: tx.from,
                  to: tx.to,
                  value: tx.value,
                  tokenSymbol: tokenSymbol,
                  contractAddress: tx.contractAddress,
                  functionName: tx.functionName || null,
                  transfer
                };
              });
              
              allTransfers.push(...transformedTransfers);
              console.log(`📊 GnosisScan fallback: ${transformedTransfers.length} transferts ${tokenSymbol}`);
            }
          } catch (gnosisError) {
            console.error(`❌ Erreur GnosisScan pour ${tokenSymbol}:`, gnosisError.message);
          }
        }
      }
      
    } else {
      console.log(`⚠️ Moralis non disponible, utilisation de GnosisScan...`);
      
      // Utiliser directement GnosisScan avec le même format
      for (const [tokenSymbol, contractAddress] of Object.entries(supplyTokenAddresses)) {
        try {
          const params = new URLSearchParams({
            module: 'account',
            action: 'tokentx',
            contractaddress: contractAddress,
            address: userAddress,
            page: 1,
            offset: 10000,
            sort: 'asc'
          });
          
          if (process.env.GNOSISSCAN_API_KEY) {
            params.append('apikey', process.env.GNOSISSCAN_API_KEY);
          }
          
          const response = await fetch(`https://api.gnosisscan.io/api?${params}`);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();
          
          if (data.status === '1' && data.result) {
            // Filtrer les transactions déjà récupérées
            const newTransfers = data.result.filter(tx => !existingHashSet.has(tx.hash));
            
            // Transformer au même format
            const transformedTransfers = newTransfers.map(tx => {
              const isIncoming = tx.to.toLowerCase() === userAddress.toLowerCase();
              const transfer = isIncoming ? 'in' : 'out';
              
              return {
                timestamp: parseInt(tx.timeStamp),
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: tx.value,
                tokenSymbol: tokenSymbol,
                contractAddress: tx.contractAddress,
                functionName: tx.functionName || null,
                transfer
              };
            });
            
            allTransfers.push(...transformedTransfers);
            console.log(`📊 GnosisScan: ${transformedTransfers.length} transferts ${tokenSymbol}`);
          }
          
          // Délai entre les requêtes
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          console.error(`❌ Erreur GnosisScan pour ${tokenSymbol}:`, error.message);
        }
      }
    }
    
    // Séparer les transactions par type
    const usdcTransfers = allTransfers
      .filter(tx => tx.tokenSymbol && tx.tokenSymbol.includes('USDC'))
      .map(tx => {
        const { tokenSymbol, ...txWithoutSymbol } = tx;
        return txWithoutSymbol;
      });
    
    const wxdaiTransfers = allTransfers
      .filter(tx => tx.tokenSymbol && tx.tokenSymbol.includes('WXDAI'))
      .map(tx => {
        const { tokenSymbol, ...txWithoutSymbol } = tx;
        return txWithoutSymbol;
      });
    
    const otherTransfers = allTransfers
      .filter(tx => !tx.tokenSymbol || (!tx.tokenSymbol.includes('USDC') && !tx.tokenSymbol.includes('WXDAI')))
      .map(tx => {
        const { tokenSymbol, ...txWithoutSymbol } = tx;
        return txWithoutSymbol;
      });
    
    if (req) {
      req.stopTimer('moralis_fallback_transfers');
      req.logEvent('moralis_fallback_transfers_completed', { 
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
      req.stopTimer('moralis_fallback_transfers');
      req.logEvent('moralis_fallback_transfers_error', { 
        address: userAddress, 
        error: error.message 
      });
    }
    
    console.error(`❌ Erreur lors de la récupération des transferts de tokens:`, error);
    return {
      usdc: [],
      armmwxdai: [],
      others: [],
      total: 0
    };
  }
}

module.exports = {
  isMoralisAvailable,
  fetchMoralisTokenTransfers,
  fetchTokenTransfersWithFallback
}; 