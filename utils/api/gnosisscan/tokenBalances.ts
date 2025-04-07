import { TokenBalances } from '../types';
import { TOKENS } from '../../constants';
import { ethers } from 'ethers';

// Adresse du contrat RMM
const RMM_CONTRACT_ADDRESS = '0x12a000a8a2cd339d85119c346142adb444bc5ce5';

// Récupération de la clé API Gnosisscan
const GNOSISSCAN_API_KEY = process.env.NEXT_PUBLIC_GNOSISSCAN_API_KEY || '';
const GNOSISSCAN_API_URL = 'https://api.gnosisscan.io/api';

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
    const tokenAddress = TOKENS.armmUSDC.address;
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
    const tokenAddress = TOKENS.armmWXDAI.address;
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
    const tokenAddress = TOKENS.debtUSDC.address;
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
    const tokenAddress = TOKENS.debtWXDAI.address;
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