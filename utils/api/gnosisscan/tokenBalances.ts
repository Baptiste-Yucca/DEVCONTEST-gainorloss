import { TokenBalances } from '../types';
import { TOKENS } from '../../constants';
import { ethers } from 'ethers';

// Adresse du contrat RMM
const RMM_CONTRACT_ADDRESS = '0x12a000a8a2cd339d85119c346142adb444bc5ce5';

// Récupération de la clé API Gnosisscan
const GNOSISSCAN_API_KEY = process.env.NEXT_PUBLIC_GNOSISSCAN_API_KEY || '';
const GNOSISSCAN_API_URL = 'https://api.gnosisscan.io/api';

// Configuration de l'API backend
const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// ABI minimal pour la fonction balanceOf d'un token ERC20
const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "_owner", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "balance", "type": "uint256" }],
    "type": "function"
  }
];

// Fournisseur Ethers.js pour Gnosis Chain
const provider = new ethers.JsonRpcProvider('https://rpc.gnosis.gateway.fm');

/**
 * Récupère les balances via l'API backend RPC (multicall)
 * Plus rapide et plus efficace que les appels individuels
 * @param userAddress Adresse de l'utilisateur
 * @returns Les balances de tous les tokens
 */
export const fetchTokenBalancesRPC = async (userAddress: string): Promise<TokenBalances> => {
  try {

    const startTime = Date.now();
    const response = await fetch(`${BACKEND_API_URL}/api/balances/rpc/${userAddress}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const responseTime = Date.now() - startTime;
    
    console.log(`⏱️ Temps de réponse RPC: ${responseTime}ms`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`API Error: ${data.error || 'Unknown error'}`);
    }
    
    // Transformer les données du backend vers le format frontend
    const balances = data.data.balances;
    
    return {
      armmUSDC: balances.armmUSDC?.balance || '0',
      armmWXDAI: balances.armmWXDAI?.balance || '0',
      debtUSDC: balances.debtUSDC?.balance || '0',
      debtWXDAI: balances.debtWXDAI?.balance || '0'
    };
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération RPC des balances:', error);
    
    // Fallback vers les appels individuels en cas d'erreur
    console.log('🔄 Fallback vers les appels individuels...');
    return await fetchAllTokenBalances(userAddress);
  }
};

/**
 * Récupère le solde d'un token ERC20 via la fonction balanceOf
 * @param tokenAddress Adresse du contrat du token
 * @param userAddress Adresse de l'utilisateur
 * @returns Le solde du token
 */
const fetchERC20Balance = async (tokenAddress: string, userAddress: string): Promise<string> => {
  try {
    // Création de l'interface pour le contrat ERC20
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    
    // Appel à la fonction balanceOf
    const balance = await tokenContract.balanceOf(userAddress);
    
    // Conversion du BigInt en string
    return balance.toString();
  } catch (error) {
    console.error(`Erreur lors de la récupération du solde ERC20 (${tokenAddress}):`, error);
    return '0';
  }
};

/**
 * Récupère le solde du token armmUSDC pour une adresse donnée
 * @param userAddress Adresse de l'utilisateur
 * @returns Le solde du token armmUSDC
 */
export const fetchArmmUSDCBalance = async (userAddress: string): Promise<string> => {
  try {
    const tokenAddress = TOKENS.USDC.supplyAddress;
    return await fetchERC20Balance(tokenAddress, userAddress);
  } catch (error) {
    console.error('Erreur lors de la récupération du solde armmUSDC:', error);
    return '0';
  }
};

/**
 * Récupère le solde du token armmWXDAI pour une adresse donnée
 * @param userAddress Adresse de l'utilisateur
 * @returns Le solde du token armmWXDAI
 */
export const fetchArmmWXDAIBalance = async (userAddress: string): Promise<string> => {
  try {
    const tokenAddress = TOKENS.WXDAI.supplyAddress;
    return await fetchERC20Balance(tokenAddress, userAddress);
  } catch (error) {
    console.error('Erreur lors de la récupération du solde armmWXDAI:', error);
    return '0';
  }
};

/**
 * Récupère le solde du token debtUSDC pour une adresse donnée
 * @param userAddress Adresse de l'utilisateur
 * @returns Le solde du token debtUSDC
 */
export const fetchDebtUSDCBalance = async (userAddress: string): Promise<string> => {
  try {
    const tokenAddress = TOKENS.USDC.debtAddress;
    return await fetchERC20Balance(tokenAddress, userAddress);
  } catch (error) {
    console.error('Erreur lors de la récupération du solde debtUSDC:', error);
    return '0';
  }
};

/**
 * Récupère le solde du token debtWXDAI pour une adresse donnée
 * @param userAddress Adresse de l'utilisateur
 * @returns Le solde du token debtWXDAI
 */
export const fetchDebtWXDAIBalance = async (userAddress: string): Promise<string> => {
  try {
    const tokenAddress = TOKENS.WXDAI.debtAddress;
    return await fetchERC20Balance(tokenAddress, userAddress);
  } catch (error) {
    console.error('Erreur lors de la récupération du solde debtWXDAI:', error);
    return '0';
  }
};

/**
 * Récupère tous les soldes de tokens pour une adresse donnée
 * @param userAddress Adresse de l'utilisateur
 * @returns Les soldes de tous les tokens
 */
export const fetchAllTokenBalances = async (userAddress: string): Promise<TokenBalances> => {
  try {
    // Appel parallèle des 4 fonctions pour optimiser le temps de réponse
    const [armmUSDC, armmWXDAI, debtUSDC, debtWXDAI] = await Promise.all([
      fetchArmmUSDCBalance(userAddress),
      fetchArmmWXDAIBalance(userAddress),
      fetchDebtUSDCBalance(userAddress),
      fetchDebtWXDAIBalance(userAddress)
    ]);
    
    return {
      armmUSDC,
      armmWXDAI,
      debtUSDC,
      debtWXDAI
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des soldes de tokens:', error);
    return {
      armmUSDC: '0',
      armmWXDAI: '0',
      debtUSDC: '0',
      debtWXDAI: '0'
    };
  }
}; 