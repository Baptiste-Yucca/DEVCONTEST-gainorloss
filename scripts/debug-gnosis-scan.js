require('dotenv').config({ path: './backend/.env' });

const { SUPPLY_TOKENS_CONFIG } = require('../utils/constants');

const GNOSISSCAN_API_KEY = process.env.GNOSISSCAN_API_KEY || '';
const GNOSISSCAN_API_URL = 'https://api.gnosisscan.io/api';

async function debugGnosisScanTransactions(walletAddress, tokenSymbol) {
  try {
    console.log(`🔍 Debug Gnosis Scan pour ${walletAddress} et ${tokenSymbol}`);
    
    const tokenConfig = SUPPLY_TOKENS_CONFIG[tokenSymbol];
    if (!tokenConfig) {
      throw new Error(`Token ${tokenSymbol} non configuré`);
    }

    const allTransactions = [];
    let page = 1;
    let hasMoreData = true;

    while (hasMoreData) {
      console.log(`📄 Récupération page ${page} pour ${tokenSymbol}`);
      
      const url = `${GNOSISSCAN_API_URL}?module=account&action=tokentx&contractaddress=${tokenConfig.address}&address=${walletAddress}&startblock=${tokenConfig.startBlock}&endblock=99999999&page=${page}&offset=1000&sort=asc&apikey=${GNOSISSCAN_API_KEY}`;
      
      console.log(`🔗 URL: ${url.replace(GNOSISSCAN_API_KEY, '***API_KEY***')}`);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.status !== '1') {
        throw new Error(`API Error: ${data.message || 'Unknown error'}`);
      }
      
      const transactions = data.result || [];
      
      console.log(`📊 Page ${page}: ${transactions.length} transactions`);
      
      // Afficher toutes les transactions avec leurs détails
      transactions.forEach((tx, index) => {
        const functionName = tx.functionName ? tx.functionName.split('(')[0] : 'unknown';
        const isMoveIn = tx.to.toLowerCase() === walletAddress.toLowerCase();
        const isMoveOut = tx.from.toLowerCase() === walletAddress.toLowerCase();
        
        console.log(`  ${index + 1}. Hash: ${tx.hash}`);
        console.log(`     Function: ${functionName}`);
        console.log(`     From: ${tx.from}`);
        console.log(`     To: ${tx.to}`);
        console.log(`     Amount: ${tx.value}`);
        console.log(`     Block: ${tx.blockNumber}`);
        console.log(`     Timestamp: ${tx.timeStamp}`);
        console.log(`     Move: ${isMoveIn ? 'IN' : isMoveOut ? 'OUT' : 'BOTH'}`);
        console.log('');
      });
      
      allTransactions.push(...transactions);
      
      // Vérifier s'il y a plus de données à récupérer
      hasMoreData = transactions.length === 1000;
      page++;
      
      // Pause pour respecter la limite
      if (hasMoreData) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    console.log(`\n📈 Résumé:`);
    console.log(`Total transactions: ${allTransactions.length}`);
    
    // Compter par type de fonction
    const functionCounts = {};
    allTransactions.forEach(tx => {
      const functionName = tx.functionName ? tx.functionName.split('(')[0] : 'unknown';
      functionCounts[functionName] = (functionCounts[functionName] || 0) + 1;
    });
    
    console.log(`\n📊 Répartition par fonction:`);
    Object.entries(functionCounts).forEach(([func, count]) => {
      console.log(`  ${func}: ${count}`);
    });
    
    // Chercher spécifiquement la transaction "Buy"
    const buyTransactions = allTransactions.filter(tx => {
      const functionName = tx.functionName ? tx.functionName.split('(')[0] : 'unknown';
      return functionName.toLowerCase().includes('buy');
    });
    
    console.log(`\n🔍 Transactions "Buy" trouvées: ${buyTransactions.length}`);
    buyTransactions.forEach((tx, index) => {
      console.log(`  Buy ${index + 1}:`);
      console.log(`    Hash: ${tx.hash}`);
      console.log(`    Function: ${tx.functionName}`);
      console.log(`    Amount: ${tx.value}`);
      console.log(`    From: ${tx.from}`);
      console.log(`    To: ${tx.to}`);
    });
    
  } catch (error) {
    console.error(`❌ Erreur:`, error);
  }
}

// Test avec l'adresse et le token
const walletAddress = '0xBfC71268725323DD06F32fbe81EC576195785Df5';
const tokenSymbol = 'armmV3USDC'; // ou 'armmV3WXDAI'

debugGnosisScanTransactions(walletAddress, tokenSymbol); 