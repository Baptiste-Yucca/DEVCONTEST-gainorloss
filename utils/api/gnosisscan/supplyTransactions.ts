import { SUPPLY_TOKENS_CONFIG } from '../../constants';

// Export pour CommonJS (pour les scripts)
const SUPPLY_TOKENS_CONFIG_JS = SUPPLY_TOKENS_CONFIG;

// Types pour les transactions de supply tokens
export interface SupplyTransaction {
  timestamp: string;
  amount: string;
  blockNumber: string;
  hash: string;
  moveType: 'move_in' | 'move_out';
  functionName: string;
}

export interface GnosisScanTransaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  contractAddress: string;
  to: string;
  value: string;
  functionName: string;
  [key: string]: any;
}

// Configuration de l'API Gnosis Scan
const GNOSISSCAN_API_KEY = process.env.NEXT_PUBLIC_GNOSISSCAN_API_KEY || '';
const GNOSISSCAN_API_URL = 'https://api.gnosisscan.io/api';

/**
 * Récupère toutes les transactions d'un wallet pour un token supply donné
 * @param walletAddress Adresse du wallet
 * @param tokenSymbol Symbole du token (armmV3WXDAI, armmV3USDC, rmmV2WXDAI)
 * @param startBlock Block de départ (optionnel, utilise le bloc par défaut si non fourni)
 * @returns Array des transactions formatées
 */
export const fetchSupplyTokenTransactions = async (
  walletAddress: string,
  tokenSymbol: keyof typeof SUPPLY_TOKENS_CONFIG,
  startBlock?: number
): Promise<SupplyTransaction[]> => {
  try {
    console.log(`🚀 Récupération des transactions ${tokenSymbol} pour ${walletAddress}`);
    
    const tokenConfig = SUPPLY_TOKENS_CONFIG[tokenSymbol];
    if (!tokenConfig) {
      throw new Error(`Token ${tokenSymbol} non configuré`);
    }

    const blockStart = startBlock || tokenConfig.startBlock;
    const allTransactions: SupplyTransaction[] = [];
    let page = 1;
    let hasMoreData = true;

    while (hasMoreData) {
      console.log(`📄 Récupération page ${page} pour ${tokenSymbol}`);
      
      const url = `${GNOSISSCAN_API_URL}?module=account&action=tokentx&contractaddress=${tokenConfig.address}&address=${walletAddress}&startblock=${blockStart}&endblock=99999999&page=${page}&offset=1000&sort=asc&apikey=${GNOSISSCAN_API_KEY}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.status !== '1') {
        throw new Error(`API Error: ${data.message || 'Unknown error'}`);
      }
      
      const transactions: GnosisScanTransaction[] = data.result || [];
      
      // Transformer les transactions
      const formattedTransactions = transactions.map(tx => formatTransaction(tx, walletAddress));
      allTransactions.push(...formattedTransactions);
      
      // Vérifier s'il y a plus de données à récupérer
      hasMoreData = transactions.length === 1000;
      page++;
      
      // Petite pause pour éviter de surcharger l'API
      if (hasMoreData) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`✅ Récupération terminée: ${allTransactions.length} transactions pour ${tokenSymbol}`);
    return allTransactions;
    
  } catch (error) {
    console.error(`❌ Erreur lors de la récupération des transactions ${tokenSymbol}:`, error);
    throw error;
  }
};

/**
 * Formate une transaction Gnosis Scan vers le format standard
 * @param tx Transaction brute de l'API
 * @param walletAddress Adresse du wallet à analyser
 * @returns Transaction formatée
 */
const formatTransaction = (tx: GnosisScanTransaction, walletAddress: string): SupplyTransaction => {
  // Déterminer le type de mouvement
  const isMoveIn = tx.to.toLowerCase() === walletAddress.toLowerCase();
  const isMoveOut = tx.from.toLowerCase() === walletAddress.toLowerCase();
  
  let moveType: 'move_in' | 'move_out';
  if (isMoveIn && !isMoveOut) {
    moveType = 'move_in';
  } else if (isMoveOut && !isMoveIn) {
    moveType = 'move_out';
  } else {
    // Cas où le wallet est à la fois from et to (transfer interne)
    moveType = 'move_in'; // Par défaut, on considère comme un move_in
  }
  
  // Extraire le nom de la fonction (avant la parenthèse)
  const functionName = tx.functionName ? tx.functionName.split('(')[0] : 'unknown';
  
  return {
    timestamp: tx.timeStamp,
    amount: tx.value,
    blockNumber: tx.blockNumber,
    hash: tx.hash,
    moveType,
    functionName
  };
};

/**
 * Récupère les transactions depuis un bloc spécifique
 * @param walletAddress Adresse du wallet
 * @param tokenSymbol Symbole du token
 * @param fromBlock Block de départ
 * @returns Array des transactions formatées
 */
export const fetchSupplyTokenTransactionsFromBlock = async (
  walletAddress: string,
  tokenSymbol: keyof typeof SUPPLY_TOKENS_CONFIG,
  fromBlock: number
): Promise<SupplyTransaction[]> => {
  return fetchSupplyTokenTransactions(walletAddress, tokenSymbol, fromBlock);
};

/**
 * Test de la fonction avec l'exemple fourni
 */
export const testSupplyTokenTransactions = async () => {
  const walletAddress = '0xBfC71268725323DD06F32fbe81EC576195785Df5';
  const tokenSymbol = 'armmV3WXDAI';
  
  try {
    console.log('🧪 Test de récupération des transactions supply token...');
    const transactions = await fetchSupplyTokenTransactions(walletAddress, tokenSymbol);
    
    console.log(`📊 Résultats du test:`);
    console.log(`- Nombre de transactions: ${transactions.length}`);
    console.log(`- Premières transactions:`, transactions.slice(0, 3));
    
    return transactions;
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    throw error;
  }
};

// Export pour CommonJS
module.exports = {
  fetchSupplyTokenTransactions,
  fetchSupplyTokenTransactionsFromBlock,
  testSupplyTokenTransactions,
  SUPPLY_TOKENS_CONFIG_JS
}; 