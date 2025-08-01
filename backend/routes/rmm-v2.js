const express = require('express');
const router = express.Router();

// Configuration du subgraph
const SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/id/QmXT8Cpkjevu2sPN1fKkwb7Px9Wqj84DALA2TQ8nokhj7e';
const RMM_CONTRACT = '0x7bb834017672b1135466661d8dd69c5dd0b3bf51';

// Queries GraphQL pour les différents types de transactions
const QUERIES = {
  borrows: `
    query GetBorrows($user: String!) {
      borrows(
        where: { user: $user }
        orderBy: timestamp
        orderDirection: asc
      ) {
        id
        amount
        reserve { 
          symbol 
        }
        timestamp
      }
    }
  `,
  
  repays: `
    query GetRepays($user: String!) {
      repays(
        where: { user: $user }
        orderBy: timestamp
        orderDirection: asc
      ) {
        id
        amount
        reserve { 
          symbol 
        }
        timestamp
      }
    }
  `,
  
  deposits: `
    query GetDeposits($user: String!) {
      deposits(
        where: { user: $user }
        orderBy: timestamp
        orderDirection: asc
      ) {
        id
        amount
        reserve { 
          symbol 
        }
        timestamp
      }
    }
  `,
  
  redeemUnderlyings: `
    query GetRedeemUnderlyings($user: String!) {
      redeemUnderlyings(
        where: { user: $user }
        orderBy: timestamp
        orderDirection: asc
      ) {
        id
        amount
        reserve { 
          symbol 
        }
        timestamp
      }
    }
  `
};

// Fonction pour interroger le subgraph
async function querySubgraph(query, variables) {
  try {
    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    return data.data;
  } catch (error) {
    console.error('Erreur lors de la requête subgraph:', error);
    throw error;
  }
}

// Fonction pour formater les montants (conversion depuis base units)
function formatAmount(amount, decimals = 18) {
  return parseFloat(amount) / Math.pow(10, decimals);
}

// Fonction pour formater les timestamps
function formatTimestamp(timestamp) {
  return new Date(parseInt(timestamp) * 1000).toISOString();
}

// Fonction pour extraire le hash de transaction depuis l'ID
function extractTransactionHash(id) {
  const parts = id.split(':');
  if (parts.length >= 3) {
    return parts[2]; // Le hash est le 3ème élément après les ":"
  }
  return null;
}

// Fonction pour filtrer les transactions par symboles de tokens
function filterTransactionsBySymbol(transactions, allowedSymbols = ['rmmWXDAI']) {
  return transactions.filter(tx => 
    tx.reserve && 
    tx.reserve.symbol && 
    allowedSymbols.includes(tx.reserve.symbol)
  );
}

// Fonction pour organiser les transactions par token natif
function organizeTransactionsByToken(transactions) {
  const organized = {
    WXDAI: {
      debt: [], // borrows + repays
      supply: [] // deposits + withdraws
    }
  };

  // Organiser les borrows et repays (debt) - seulement WXDAI
  [...transactions.borrows, ...transactions.repays].forEach(tx => {
    if (tx.reserve === 'rmmWXDAI') {
      organized.WXDAI.debt.push(tx);
    }
  });

  // Organiser les deposits et withdraws (supply) - seulement WXDAI
  [...transactions.deposits, ...transactions.redeemUnderlyings].forEach(tx => {
    if (tx.reserve === 'rmmWXDAI') {
      organized.WXDAI.supply.push(tx);
    }
  });

  // Trier par timestamp
  Object.keys(organized).forEach(token => {
    organized[token].debt.sort((a, b) => a.timestamp - b.timestamp);
    organized[token].supply.sort((a, b) => a.timestamp - b.timestamp);
  });

  return organized;
}

// Fonction pour récupérer toutes les transactions d'un utilisateur
async function fetchUserTransactions(userAddress) {
  const allTransactions = {
    borrows: [],
    repays: [],
    deposits: [],
    redeemUnderlyings: []
  };

  // Récupérer tous les types de transactions
  for (const [type, query] of Object.entries(QUERIES)) {
    try {
      const variables = {
        user: userAddress.toLowerCase()
      };

      const data = await querySubgraph(query, variables);
      const transactions = data[type] || [];

      // Filtrer les transactions par symboles de tokens
      const filteredTransactions = filterTransactionsBySymbol(transactions);

      // Formater les transactions
      const formattedTransactions = filteredTransactions.map(tx => {
        const txHash = extractTransactionHash(tx.id);
        const decimals = 18; // WXDAI = 18
        
        return {
          txHash: txHash,
          amount: tx.amount,
          amountFormatted: formatAmount(tx.amount, decimals),
          timestamp: tx.timestamp,
          type: type === 'redeemUnderlyings' ? 'withdraw' : type.slice(0, -1), // Enlever le 's' final
          reserve: tx.reserve.symbol
        };
      });

      allTransactions[type] = formattedTransactions;

    } catch (error) {
      console.error(`Erreur lors de la récupération des ${type}:`, error);
      allTransactions[type] = [];
    }
  }

  // Organiser par token natif
  return organizeTransactionsByToken(allTransactions);
}

// Route principale v2
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;

    // Validation de l'adresse
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Adresse EVM invalide'
      });
    }

    console.log(`🔍 Récupération des transactions RMM v2 pour: ${address}`);

    // Récupérer toutes les transactions
    const transactions = await fetchUserTransactions(address);

    // Calculer les statistiques par token
    const stats = {
      WXDAI: {
        debt: transactions.WXDAI.debt.length,
        supply: transactions.WXDAI.supply.length,
        total: transactions.WXDAI.debt.length + transactions.WXDAI.supply.length
      }
    };

    // Calculer les montants totaux par token
    const totals = {
      WXDAI: {
        debt: transactions.WXDAI.debt.reduce((sum, tx) => sum + tx.amountFormatted, 0),
        supply: transactions.WXDAI.supply.reduce((sum, tx) => sum + tx.amountFormatted, 0)
      }
    };

    // Préparer la réponse
    const response = {
      success: true,
      data: {
        address: address,
        contract: RMM_CONTRACT,
        subgraphUrl: 'https://api.thegraph.com/subgraphs/id/QmXT8Cpkjevu2sPN1fKkwb7Px9Wqj84DALA2TQ8nokhj7e',
        stats,
        totals,
        transactions,
        timestamp: new Date().toISOString()
      }
    };

    console.log(`✅ Transactions récupérées: ${stats.WXDAI.total} transactions`);
    res.json(response);

  } catch (error) {
    console.error('❌ Erreur dans la route RMM v2:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur interne du serveur'
    });
  }
});

// Route pour obtenir les transactions par type
router.get('/:address/:type', async (req, res) => {
  try {
    const { address, type } = req.params;
    const validTypes = ['borrows', 'repays', 'deposits', 'redeemUnderlyings'];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Type invalide. Types valides: ${validTypes.join(', ')}`
      });
    }

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        error: 'Adresse EVM invalide'
      });
    }

    console.log(`🔍 Récupération des ${type} pour: ${address}`);

    const query = QUERIES[type];
    const variables = {
      user: address.toLowerCase()
    };

    const data = await querySubgraph(query, variables);
    const transactions = data[type] || [];

    // Filtrer les transactions par symboles de tokens
    const filteredTransactions = filterTransactionsBySymbol(transactions);

    // Formater les transactions
    const formattedTransactions = filteredTransactions.map(tx => {
      const txHash = extractTransactionHash(tx.id);
      const decimals = 18; // WXDAI = 18
      
      return {
        txHash: txHash,
        amount: tx.amount,
        amountFormatted: formatAmount(tx.amount, decimals),
        timestamp: tx.timestamp,
        type: type === 'redeemUnderlyings' ? 'withdraw' : type.slice(0, -1),
        reserve: tx.reserve.symbol
      };
    });

    const response = {
      success: true,
      data: {
        address,
        type,
        count: formattedTransactions.length,
        transactions: formattedTransactions,
        timestamp: new Date().toISOString()
      }
    };

    console.log(`✅ ${type} récupérés: ${formattedTransactions.length} transactions`);
    res.json(response);

  } catch (error) {
    console.error(`❌ Erreur lors de la récupération des ${req.params.type}:`, error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur interne du serveur'
    });
  }
});

module.exports = router; 