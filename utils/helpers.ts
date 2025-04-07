import { ethers } from 'ethers';
import { TOKENS, RESERVE_TO_TOKEN } from './constants';

export const isValidEthereumAddress = (address: string): boolean => {
  return ethers.isAddress(address);
};

export const formatAmount = (amount: string, reserveId: string): string => {
  // Récupérer le symbole du token à partir de l'adresse de réserve (42 premiers caractères)
  const tokenAddress = reserveId.substring(0, 42).toLowerCase();
  const tokenKey = RESERVE_TO_TOKEN[tokenAddress];
  if (!tokenKey) return '0.00';
  
  const token = TOKENS[tokenKey];
  if (!token) return '0.00';
  
  // Formater le montant en fonction des décimales du token
  const formattedAmount = ethers.formatUnits(amount, token.decimals);
  
  // Limiter à 2 décimales pour l'affichage et ajouter le symbole
  return parseFloat(formattedAmount).toFixed(2);
};

export const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleString('fr-FR');
}; 