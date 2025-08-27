import { ethers } from 'ethers';
import { TOKENS, ADDRESS_TO_TOKEN } from './constants';

// Types pour les tokens
type TokenKey = keyof typeof TOKENS;
type AddressToToken = typeof ADDRESS_TO_TOKEN;


export const formatAmount = (amount: string, reserveId: string): string => {
  try {
    // Récupérer le symbole du token à partir de l'adresse de réserve (42 premiers caractères)
    const tokenAddress = reserveId.substring(0, 42).toLowerCase();
    const tokenKey = ADDRESS_TO_TOKEN[tokenAddress as keyof AddressToToken] as TokenKey;
    if (!tokenKey) return '0.00';
    
    const token = TOKENS[tokenKey];
    if (!token) return '0.00';
    
    // Formater le montant en fonction des décimales du token
    const formattedAmount = ethers.formatUnits(amount, token.decimals);
    
    // Limiter à 2 décimales pour l'affichage et ajouter le symbole
    return parseFloat(formattedAmount).toFixed(2);
  } catch (error) {
    console.warn('Erreur lors du formatage du montant:', error);
    return '0.00';
  }
};
