const fetch = require('node-fetch');

// Configuration Gnosisscan
const GNOSISSCAN_API_URL = 'https://api.etherscan.io/v2/api';
const API_KEY = '4DIPDRRSNUDM81QM2PMHTY8H6X5V6EYK7F'; // process.env.GNOSISSCAN_API_KEY || '';

/**
 * Récupère toutes les transactions de token avec pagination et respect des limites d'API
 * Simule l'appel curl: https://api.etherscan.io/v2/api?chainid=100&module=account&action=tokentx&...
 * 
 * @param {string} userAddress - Adresse de l'utilisateur
 * @param {string} tokenAddress - Adresse du token contract
 * @param {number} startBlock - Bloc de début (ex: 32074665 pour V3)
 * @param {number} endBlock - Bloc de fin (ex: 99999999)
 * @param {Object} req - Objet request pour le logging (optionnel)
 * @returns {Promise<Array>} - Tableau des transactions
 */
async function fetchAllTokenTransactions(
  userAddress, 
  tokenAddress, 
  startBlock = 32074665, 
  endBlock = 99999999, 
  req = null
) {

  try {
    console.log(`🔄 Récupération de toutes les transactions de token ${tokenAddress} pour ${userAddress}`);
    console.log(`📊 Blocs: ${startBlock} → ${endBlock}`);
    
    const allTransactions = [];
    let currentPage = 1;
    let hasMoreData = true;
    let totalTransactions = 0;
    
    // ✅ RESPECTER LA LIMITE: 2 requêtes par seconde maximum
    const DELAY_BETWEEN_REQUESTS = 500; // 500ms = 2 req/s max
    
    while (hasMoreData) {
      console.log(`📄 Page ${currentPage}...`);
      
      // ✅ PARAMÈTRES IDENTIQUES À L'APPEL CURL
      const params = new URLSearchParams({
        chainid: '100', // Gnosis Chain
        module: 'account',
        action: 'tokentx',
        address: userAddress,
        contractaddress: tokenAddress,
        startblock: startBlock,
        endblock: endBlock,
        sort: 'asc',
        page: currentPage,
        offset: 1000 // Maximum par page
      });
      
      if (API_KEY) {
        params.append('apikey', API_KEY);
      }
      
      const url = `${GNOSISSCAN_API_URL}?${params}`;
      console.log(`🌐 URL: ${url.replace(API_KEY || '', '[API_KEY]')}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.status === '1' && data.result) {
        const transactions = data.result;
        const transactionCount = transactions.length;
        
        console.log(`📊 Page ${currentPage}: ${transactionCount} transactions reçues`);
        
        // Ajouter les transactions à la liste
        allTransactions.push(...transactions);
        totalTransactions += transactionCount;
        
        // ✅ VÉRIFIER SI IL Y A PLUS DE DONNÉES
        if (transactionCount < 1000) {
          console.log(`✅ Fin de pagination: ${transactionCount} < 1000`);
          hasMoreData = false;
        } else {
          console.log(`🔄 Plus de données disponibles, page suivante...`);
          currentPage++;
          
          // ✅ RESPECTER LA LIMITE D'API: attendre 500ms
          if (currentPage > 1) {
            console.log(`⏱️  Attente ${DELAY_BETWEEN_REQUESTS}ms pour respecter la limite d'API...`);
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
          }
        }
      } else {
        // Gérer les erreurs d'API
        if (data.message && data.message.includes('rate limit')) {
          console.error(`❌ Limite d'API atteinte: ${data.message}`);
          throw new Error(`Limite d'API GnosisScan atteinte: ${data.message}`);
        } else if (data.message) {
          console.error(`❌ Erreur API GnosisScan: ${data.message}`);
          throw new Error(`Erreur API GnosisScan: ${data.message}`);
        } else {
          console.error(`❌ Réponse API invalide:`, data);
          throw new Error('Réponse API GnosisScan invalide');
        }
      }
    }
    
    console.log(`🎯 Total final: ${totalTransactions} transactions récupérées en ${currentPage} pages`);  
    return allTransactions;
    
  } catch (error) { 
    console.error(`❌ Erreur lors de la récupération des transactions de token:`, error);
    throw error;
  }
}

/**
 * Récupère les transactions de token avec des blocs spécifiques pour V2 et V3
 * @param {string} userAddress - Adresse de l'utilisateur
 * @param {string} tokenAddress - Adresse du token contract
 * @param {string} version - Version du protocole ('V2' ou 'V3')
 * @param {Object} req - Objet request pour le logging (optionnel)
 * @returns {Promise<Array>} - Tableau des transactions
 */
async function fetchTokenTransactionsByVersion(
  userAddress, 
  tokenAddress, 
  version = 'V3', 
  req = null
) {
  try {
    // ✅ BLOCS SPÉCIFIQUES PAR VERSION
    const blockRanges = {
      'V2': {
        startBlock: 1, // À ajuster selon le déploiement V2
        endBlock: 99999999    // Juste avant V3
      },
      'V3': {
        startBlock: 32074665, // Déploiement V3
        endBlock: 99999999    // Jusqu'à maintenant
      }
    };
    
    const range = blockRanges[version] || blockRanges['V3'];
    
    console.log(`🚀 Récupération des transactions ${version} pour ${tokenAddress}`);
    console.log(`📊 Blocs: ${range.startBlock} → ${range.endBlock}`);
    
    return await fetchAllTokenTransactions(
      userAddress, 
      tokenAddress, 
      range.startBlock, 
      range.endBlock, 
      req
    );
    
  } catch (error) {
    console.error(`❌ Erreur lors de la récupération des transactions ${version}:`, error);
    throw error;
  }
}

/**
 * Récupère et post-traite les transactions de supply tokens via GnosisScan
 * @param {string} userAddress - Adresse de l'utilisateur
 * @param {Array} existingTransactions - Transactions déjà connues (pour éviter les doublons)
 * @param {string} version - Version du protocole ('V2' ou 'V3')
 * @param {Object} req - Objet request pour le logging (optionnel)
 * @returns {Promise<Object>} - Transactions formatées par token
 */
async function fetchSupplyTokenTransactionsViaGnosisScan(
  userAddress, 
  existingTransactions = [], 
  version = 'V3', 
  req = null
) {
  
  try {
    console.log(`🚀 Récupération des transactions supply ${version} pour ${userAddress}`);
    
    // ✅ ADRESSES DES SUPPLY TOKENS SELON LA VERSION
    const supplyTokenAddresses = {
      'V3': {
        'USDC': '0xeD56F76E9cBC6A64b821e9c016eAFbd3db5436D1', // armmUSDC
        'WXDAI': '0x0cA4f5554Dd9Da6217d62D8df2816c82bba4157b'  // armmWXDAI
      },
      'V2': {
        'WXDAI': '0x7349C9eaA538e118725a6130e0f8341509b9f8A0'  // rmmV2WXDAI
      }
    };
    
    const tokensToFetch = supplyTokenAddresses[version] || supplyTokenAddresses['V3'];
    const allRawTransactions = {};
    const allFormattedTransactions = {};
    
    // ✅ RÉCUPÉRER LES TRANSACTIONS POUR CHAQUE TOKEN
    for (const [tokenSymbol, contractAddress] of Object.entries(tokensToFetch)) {
      console.log(`📊 Récupération des transactions ${tokenSymbol} (${contractAddress})...`);
      
      try {
        const rawTransactions = await fetchAllTokenTransactions(
          userAddress,
          contractAddress,
          version === 'V2' ? 1 : 32074665, // V2: bloc 1, V3: bloc 32074665
          99999999,
          req
        );
        
        allRawTransactions[tokenSymbol] = rawTransactions;
        console.log(`✅ ${rawTransactions.length} transactions brutes récupérées pour ${tokenSymbol}`);
        
      } catch (error) {
        console.error(`❌ Erreur lors de la récupération des transactions ${tokenSymbol}:`, error);
        allRawTransactions[tokenSymbol] = [];
      }
      
      // ✅ RESPECTER LA LIMITE D'API ENTRE LES TOKENS
      if (Object.keys(tokensToFetch).length > 1) {
        console.log(`⏱️  Attente 500ms entre les tokens pour respecter la limite d'API...`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // ✅ POST-TRAITEMENT GLOBAL APRÈS TOUS LES APPELS
    console.log(`🔄 Post-traitement des transactions ${version}...`);
    
    for (const [tokenSymbol, rawTransactions] of Object.entries(allRawTransactions)) {
      console.log(`🔍 Post-traitement de ${rawTransactions.length} transactions ${tokenSymbol}...`);
      
      // ✅ FILTRER ET FORMATER LES TRANSACTIONS
      const filteredTransactions = rawTransactions
        .filter(tx => {
          // ❌ ÉLIMINER LES MINT/BURN (from ou to = 0x0000...)
          if (tx.from === '0x0000000000000000000000000000000000000000' || 
              tx.to === '0x0000000000000000000000000000000000000000') {
            return false;
          }
          
          // ✅ VÉRIFIER SI LA TRANSACTION EXISTE DÉJÀ DANS THEGRAPH
          const isAlreadyKnown = existingTransactions.supplies.some(existingTx => 
            existingTx.hash === tx.hash
          ) || existingTransactions.withdraws.some(existingTx => 
            existingTx.hash === tx.hash
          );
          
          if (isAlreadyKnown) {
            return false;
          }
          
          return true;
        })
        .map(tx => {
          // ✅ DÉTERMINER LE TYPE SELON LA DIRECTION
          let type;
          if (tx.to.toLowerCase() === userAddress.toLowerCase()) {
            // ✅ VÉRIFIER SI C'EST UNE FONCTION DISPERSETOKEN
            if (tx.functionName && tx.functionName.includes('disperseToken(address token, address[] recipients, uint256[] values)')) {
              type = 'ronday'; // L'utilisateur reçoit des tokens via Ronday
            } else {
              type = 'in_others'; // L'utilisateur reçoit des tokens (cas par défaut)
            }
          } else if (tx.from.toLowerCase() === userAddress.toLowerCase()) {
            type = 'out_others'; // L'utilisateur envoie des tokens
          } else {
            type = 'unknown'; // Cas par défaut (ne devrait pas arriver après filtrage)
          }
          
          // ✅ FORMATER AU FORMAT FRONTEND
          return {
            txHash: tx.hash,
            amount: tx.value,
            timestamp: parseInt(tx.timeStamp),
            type: type,
            token: tokenSymbol,
            version: version
          };
        });
      
      console.log(`✅ ${filteredTransactions.length} transactions ${tokenSymbol} après filtrage`);
      allFormattedTransactions[tokenSymbol] = filteredTransactions;
    }
    
    // ✅ RÉSUMÉ FINAL
    const totalTransactions = Object.values(allFormattedTransactions)
      .reduce((total, transactions) => total + transactions.length, 0);
    
    console.log(`🎯 Total final ${version}: ${totalTransactions} transactions uniques`);
    
    return allFormattedTransactions;
    
  } catch (error) {  
    console.error(`❌ Erreur lors de la récupération des transactions supply ${version}:`, error);
    throw error;
  }
}

module.exports = {
  fetchAllTokenTransactions,
  fetchTokenTransactionsByVersion,
  // ✅ NOUVELLE FONCTION PRINCIPALE
  fetchSupplyTokenTransactionsViaGnosisScan
};

