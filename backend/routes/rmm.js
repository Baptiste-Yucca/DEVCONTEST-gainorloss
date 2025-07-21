const express = require('express');
const router = express.Router();
const { fetchAllTransactions } = require('../services/graphql');

/**
 * @route GET /api/rmm/v3/:address1/:address2?/:address3?
 * @desc Récupérer les données RMM pour 1 à 3 adresses
 * @access Public
 */
router.get('/v3/:address1/:address2?/:address3?', async (req, res) => {
  try {
    const { address1, address2, address3 } = req.params;
    
    // Validation des adresses
    const addresses = [address1, address2, address3].filter(addr => addr);
    
    if (addresses.length === 0) {
      return res.status(400).json({
        error: 'Adresse manquante',
        message: 'Au moins une adresse est requise'
      });
    }
    
    if (addresses.length > 3) {
      return res.status(400).json({
        error: 'Trop d\'adresses',
        message: 'Maximum 3 adresses autorisées'
      });
    }
    
    // Validation du format des adresses EVM
    const evmAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    for (const address of addresses) {
      if (!evmAddressRegex.test(address)) {
        return res.status(400).json({
          error: 'Format d\'adresse invalide',
          message: `L'adresse ${address} n'est pas au format EVM valide`
        });
      }
    }
    
    console.log(`🔍 Récupération des données RMM pour ${addresses.length} adresse(s):`, addresses);
    
    // Récupérer les données pour chaque adresse
    const results = [];
    
    for (const address of addresses) {
      try {
        console.log(`📊 Traitement de l'adresse: ${address}`);
        
        // Récupérer les données GraphQL pour cette adresse
        const addressData = await fetchAddressDataFromService(address);
        
        results.push({
          address,
          success: true,
          data: addressData
        });
        
      } catch (error) {
        console.error(`❌ Erreur pour l'adresse ${address}:`, error.message);
        
        results.push({
          address,
          success: false,
          error: error.message
        });
      }
    }
    
    // Statistiques globales
    const successfulResults = results.filter(r => r.success);
    const totalTransactions = successfulResults.reduce((sum, result) => {
      return sum + (result.data.summary?.total || 0);
    }, 0);
    
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      addresses: addresses,
      summary: {
        totalAddresses: addresses.length,
        successfulAddresses: successfulResults.length,
        totalTransactions: totalTransactions
      },
      results: results
    };
    
    console.log(`✅ Réponse générée: ${successfulResults.length}/${addresses.length} adresses traitées avec succès`);
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Erreur dans l\'API RMM:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur',
      message: error.message
    });
  }
});

/**
 * Fonction pour récupérer les données d'une adresse via le service consolidé
 */
async function fetchAddressDataFromService(address) {
  try {
    // Utiliser le service GraphQL consolidé
    const allTransactions = await fetchAllTransactions(address);
    
    // Calculer les statistiques
    const summary = {
      borrows: allTransactions.borrows.length,
      supplies: allTransactions.supplies.length,
      withdraws: allTransactions.withdraws.length,
      repays: allTransactions.repays.length,
      total: allTransactions.total
    };
    
    return {
      summary,
      transactions: allTransactions
    };
    
  } catch (error) {
    console.error(`Erreur lors de la récupération des données pour ${address}:`, error);
    throw error;
  }
}

module.exports = router; 