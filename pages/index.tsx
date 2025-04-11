import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Header from '../components/Header';
import AddressForm from '../components/AddressForm';
import Loading from '../components/Loading';
import { formatAmount, formatTimestamp } from '../utils/helpers';
import { TOKENS, ADDRESS_SC_TO_TOKEN } from '../utils/constants';
import { AddressData } from '../utils/services/address';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
} from 'chart.js';

import { fetchAddressData } from '../utils/services/address';
import { DailyData } from '../types/dailyData';
import { TransactionWithType } from '../types/transaction';
import { TokenBalances } from '../utils/api/types';


// Enregistrer les composants ChartJS
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);



export default function Home() {
  const [address, setAddress] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState<boolean>(false);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithType[]>([]);
  const [tokenBalances, setTokenBalances] = useState<TokenBalances>({
    armmUSDC: '0',
    armmWXDAI: '0',
    debtUSDC: '0',
    debtWXDAI: '0'
  });


  const handleAddressSubmit = async (address: string) => {
    try {
      setLoading(true);
      setError('');
      
      const result = await fetchAddressData(address);
      
      // Utiliser les différentes parties des données
      setTokenBalances(result.tokenBalances);
      
      // Trier les données du plus vieux au plus récent
      const sortedData = [...result.dailyData].sort((a, b) => {
        return parseInt(a.date) - parseInt(b.date);
      });
      
      setDailyData(sortedData);
      setTransactions(result.transactions);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setDailyData([]);
    } finally {
      setLoading(false);
    }
  };

  // Formater les intérêts estimés
  const formatTokenAmount = (amount: string, decimals: number) => {
    // Utiliser BigInt pour éviter les erreurs de précision avec les grands nombres
    if (!amount || amount === '0') return '0.00';
    
    try {
      const amountBigInt = BigInt(amount);
      const divisor = BigInt(10 ** decimals);
      const integerPart = amountBigInt / divisor;
      const fractionalPart = amountBigInt % divisor;
      
      // Formatage avec 2 décimales
      let fractionalStr = fractionalPart.toString().padStart(decimals, '0');
      fractionalStr = fractionalStr.substring(0, 2).padEnd(2, '0');
      
      return `${integerPart}.${fractionalStr}`;
    } catch (error) {
      console.error("Erreur de formatage du montant:", error, "Montant:", amount);
      return '0.00';
    }
  };



  // Fonction pour obtenir la classe CSS du type de transaction
  const getTransactionTypeStyle = (type: string): string => {
    switch (type) {
      case 'supply':
        return 'bg-blue-100 text-blue-800';
      case 'withdraw':
        return 'bg-green-100 text-green-800';
      case 'borrow':
        return 'bg-purple-100 text-purple-800';
      case 'repay':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Fonction pour obtenir le libellé du type de transaction
  const getTransactionTypeLabel = (type: string): string => {
    switch (type) {
      case 'supply':
        return 'Dépôt';
      case 'withdraw':
        return 'Retrait';
      case 'borrow':
        return 'Emprunt';
      case 'repay':
        return 'Remboursement';
      default:
        return type;
    }
  };

  // Fonction pour obtenir le symbole du token à partir de l'adresse de réserve
  const getTokenSymbol = (reserveId: string): string => {
    const tokenAddress = reserveId.substring(0, 42).toLowerCase();
    const tokenKey = ADDRESS_SC_TO_TOKEN[tokenAddress];
    return tokenKey ? TOKENS[tokenKey].symbol : 'Inconnu';
  };






  // Ajouter d'un composant Error
  const ErrorMessage = ({ message }: { message: string }) => (
    <div className="my-4 p-4 bg-red-100 text-red-700 rounded-md">
      {message}
    </div>
  );

  // Fonction spécifique pour afficher le tableau DailyData
  const displayDailyData = (dailyData: DailyData[]) => {
    if (!dailyData || dailyData.length === 0) {
      return (
        <div className="mt-8 text-center text-gray-600">
          Aucune donnée disponible pour cette adresse
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-md">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-3 px-4 text-left">Date</th>
              <th className="py-3 px-4 text-right">Montant (USDC)</th>
              <th className="py-3 px-4 text-right">Intérêt (USDC)</th>
              <th className="py-3 px-4 text-right">Taux</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {dailyData.map((data, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="py-3 px-4">{data.date}</td>
                <td className="py-3 px-4 text-right">{Number(data.amount) / 1000000}</td>
                <td className="py-3 px-4 text-right">{Number(data.interest) / 1000000}</td>
                <td className="py-3 px-4 text-right">{parseFloat(data.rate) * 100}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>rmmgain - Dashboard</title>
        <meta name="description" content="Dashboard pour analyser les données du protocole" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />

      <main className="container mx-auto p-4 max-w-7xl">
        <div className="mt-8 mb-8">
          <h2 className="text-2xl font-bold text-center mb-6">
            Entrez votre adresse pour consulter vos transactions
          </h2>
          <AddressForm onSubmit={handleAddressSubmit} />
        </div>

        {loading && <Loading />}
        
        {error && <ErrorMessage message={error} />}

        {!loading && searched && (
          <div className="my-8">
            <h3 className="text-xl font-semibold mb-2">Résultats pour l'adresse :</h3>
            <p className="text-gray-700 mb-6 break-all">{address}</p>
            
            {displayDailyData(dailyData)}
          </div>
        )}
      </main>

      <footer className="mt-12 border-t border-gray-200 py-6">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>rmmgain - Analyse des données sur la blockchain Gnosis</p>
        </div>
      </footer>
    </div>
  );
} 