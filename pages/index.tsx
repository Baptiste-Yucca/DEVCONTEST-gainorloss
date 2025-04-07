import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from '@/components/Header';
import AddressForm from '@/components/AddressForm';
import Loading from '@/components/Loading';
import { isValidEthereumAddress } from '@/utils/helpers';
import { fetchBorrows, fetchSupplies, fetchWithdraws, fetchRepays, fetchTokenBalances } from '@/utils/api';
import { formatAmount, formatTimestamp } from '@/utils/helpers';
import { TOKENS, RESERVE_TO_TOKEN } from '@/utils/constants';
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
import { Line, Bar } from 'react-chartjs-2';
import { 
  calculateInterest, 
  calculateTotalInterestCost, 
  generateDailyCostsCSV,
  DailyCostDetail,
  displayRawRates,
  calculateDailyDebtWithInterest
} from '../utils/interest-calculations';
import { Transaction, TransactionWithType } from '../types/transaction';
import { DailyCostDetail as DailyCostDetailType } from '../types/interest';
import { Transaction as ApiTransaction } from '../utils/api/types';
import { fetchAddressData } from '../utils/services/address';

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

// Ajouter une fonction pour télécharger un PDF des résultats
const downloadPDF = () => {
  // Fonction à implémenter plus tard
  alert("La génération de PDF sera implémentée dans une future mise à jour");
};

// Fonction pour convertir les transactions de l'API en transactions avec type
const convertApiTransactions = (apiTransactions: ApiTransaction[], type: 'supply' | 'withdraw' | 'borrow' | 'repay'): Transaction[] => {
  return apiTransactions.map(tx => ({
    id: tx.id,
    timestamp: tx.timestamp,
    amount: tx.amount,
    transactionType: type,
    reserve: tx.reserve
  }));
};

export default function Home() {
  const router = useRouter();
  const [address, setAddress] = useState<string>('');
  const [allTransactions, setAllTransactions] = useState<TransactionWithType[]>([]);
  const [supplies, setSupplies] = useState<Transaction[]>([]);
  const [withdraws, setWithdraws] = useState<Transaction[]>([]);
  const [borrows, setBorrows] = useState<Transaction[]>([]);
  const [repays, setRepays] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [searched, setSearched] = useState<boolean>(false);
  const [usdcChartData, setUsdcChartData] = useState<any>(null);
  const [wxdaiChartData, setWxdaiChartData] = useState<any>(null);
  const [tokenBalances, setTokenBalances] = useState({
    armmUSDC: '0',
    armmWXDAI: '0',
    debtUSDC: '0',
    debtWXDAI: '0'
  });
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [tokenFilter, setTokenFilter] = useState<string>('all');
  const [usdcDailyCosts, setUsdcDailyCosts] = useState<number[]>([]);
  const [wxdaiDailyCosts, setWxdaiDailyCosts] = useState<number[]>([]);
  const [usdcDailyDetails, setUsdcDailyDetails] = useState<DailyCostDetailType[]>([]);
  const [wxdaiDailyDetails, setWxdaiDailyDetails] = useState<DailyCostDetailType[]>([]);
  const [dailyCostsChartData, setDailyCostsChartData] = useState<any>(null);
  const [rawRates, setRawRates] = useState<any[]>([]);
  const [showRawRates, setShowRawRates] = useState<boolean>(false);
  const [dailyDebtDetails, setDailyDebtDetails] = useState<any[]>([]);
  const [showDailyDebt, setShowDailyDebt] = useState<boolean>(false);
  const [totalInterestCost, setTotalInterestCost] = useState<number>(0);

  const handleAddressSubmit = async (address: string) => {
    setLoading(true);
    setError('');
    setAddress(address);
    
    try {
      const result = await fetchAddressData(address);
      
      // Mise à jour du state React
      setAllTransactions(result.transactions);
      setTokenBalances(result.tokenBalances);
      setDailyDebtDetails(result.dailyDebtDetails);
      setTotalInterestCost(result.totalInterest);
      setRawRates(result.rawRates);
      
      if (result.dailyDebtDetails.length > 0) {
        generateDebtChartData(result.dailyDebtDetails);
      }
      
      setSearched(true);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Erreur lors de la récupération des données');
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = (
    suppliesData: Transaction[], 
    withdrawsData: Transaction[], 
    borrowsData: Transaction[], 
    repaysData: Transaction[]
  ) => {
    // Combiner toutes les transactions pour établir une chronologie
    const allTxs = [
      ...suppliesData.map(tx => ({ ...tx, type: 'supply' })),
      ...withdrawsData.map(tx => ({ ...tx, type: 'withdraw' })),
      ...borrowsData.map(tx => ({ ...tx, type: 'borrow' })),
      ...repaysData.map(tx => ({ ...tx, type: 'repay' }))
    ].sort((a, b) => a.timestamp - b.timestamp); // Trier par date croissante

    if (allTxs.length === 0) return;

    // Initialiser les tableaux pour les graphiques
    const dates: string[] = [];
    
    // Données pour USDC
    let cumulativeUsdcSupply = 0;
    let cumulativeUsdcBorrow = 0;
    const usdcSupplyAmounts: number[] = [];
    const usdcBorrowAmounts: number[] = [];
    
    // Données pour WXDAI
    let cumulativeWxdaiSupply = 0;
    let cumulativeWxdaiBorrow = 0;
    const wxdaiSupplyAmounts: number[] = [];
    const wxdaiBorrowAmounts: number[] = [];

    // Traiter chaque transaction chronologiquement
    allTxs.forEach(tx => {
      const date = new Date(tx.timestamp * 1000).toLocaleDateString('fr-FR');
      const tokenAddress = tx.reserve.id.substring(0, 42).toLowerCase();
      const tokenKey = RESERVE_TO_TOKEN[tokenAddress];
      const token = tokenKey ? TOKENS[tokenKey] : null;
      
      if (!token) return;

      // Convertir le montant en valeur numérique
      const amountInTokens = parseFloat(formatAmount(tx.amount, tokenAddress));
      if (isNaN(amountInTokens)) {
        console.error("Montant invalide:", tx.amount, "pour token:", tokenKey);
        return;
      }
      
      // Déterminer s'il s'agit d'USDC ou de WXDAI
      const isUsdc = tokenKey === 'USDC' || tokenKey === 'armmUSDC' || tokenKey === 'debtUSDC';
      const isWxdai = tokenKey === 'WXDAI' || tokenKey === 'armmWXDAI' || tokenKey === 'debtWXDAI';
      
      // Mise à jour des valeurs cumulatives selon le type de token et de transaction
      if (isUsdc) {
        switch (tx.type) {
          case 'supply':
            cumulativeUsdcSupply += amountInTokens; // Dépôt : ajouter à la liquidité
            break;
          case 'withdraw':
            cumulativeUsdcSupply -= amountInTokens; // Retrait : soustraire de la liquidité
            break;
          case 'borrow':
            cumulativeUsdcBorrow -= amountInTokens; // Emprunt : soustraire de la dette
            break;
          case 'repay':
            cumulativeUsdcBorrow += amountInTokens; // Remboursement : ajouter à la dette
            break;
        }
      } else if (isWxdai) {
        switch (tx.type) {
          case 'supply':
            cumulativeWxdaiSupply += amountInTokens; // Dépôt : ajouter à la liquidité
            break;
          case 'withdraw':
            cumulativeWxdaiSupply -= amountInTokens; // Retrait : soustraire de la liquidité
            break;
          case 'borrow':
            cumulativeWxdaiBorrow -= amountInTokens; // Emprunt : soustraire de la dette
            break;
          case 'repay':
            cumulativeWxdaiBorrow += amountInTokens; // Remboursement : ajouter à la dette
            break;
        }
      }

      // Ajouter le point de données
      if (!dates.includes(date)) {
        dates.push(date);
        usdcSupplyAmounts.push(cumulativeUsdcSupply);
        usdcBorrowAmounts.push(cumulativeUsdcBorrow);
        wxdaiSupplyAmounts.push(cumulativeWxdaiSupply);
        wxdaiBorrowAmounts.push(cumulativeWxdaiBorrow);
      } else {
        // Mettre à jour la dernière entrée si la date existe déjà
        const lastIndex = dates.length - 1;
        usdcSupplyAmounts[lastIndex] = cumulativeUsdcSupply;
        usdcBorrowAmounts[lastIndex] = cumulativeUsdcBorrow;
        wxdaiSupplyAmounts[lastIndex] = cumulativeWxdaiSupply;
        wxdaiBorrowAmounts[lastIndex] = cumulativeWxdaiBorrow;
      }
    });

    // Ajouter un point correspondant aux soldes actuels (date d'aujourd'hui)
    const today = new Date().toLocaleDateString('fr-FR');
    
    // Convertir les soldes actuels pour afficher les valeurs exactes du portefeuille
    const armmUSDCBalance = parseFloat(formatTokenAmount(tokenBalances.armmUSDC, 6));
    const debtUSDCBalance = parseFloat(formatTokenAmount(tokenBalances.debtUSDC, 6));
    const armmWXDAIBalance = parseFloat(formatTokenAmount(tokenBalances.armmWXDAI, 18));
    const debtWXDAIBalance = parseFloat(formatTokenAmount(tokenBalances.debtWXDAI, 18));
    
    // Ajouter un console.log pour déboguer les valeurs finales
    console.log("Debug - Derniers points des graphiques:");
    console.log("USDC Liquidités:", armmUSDCBalance, "Dette:", debtUSDCBalance);
    console.log("WXDAI Liquidités:", armmWXDAIBalance, "Dette:", debtWXDAIBalance);
    console.log("tokenBalances bruts:", tokenBalances);
    
    // Si le dernier point n'est pas pour aujourd'hui, ajouter un nouveau point
    if (dates.length === 0 || dates[dates.length - 1] !== today) {
      console.log("Ajout d'un nouveau point pour aujourd'hui");
      dates.push(today);
      usdcSupplyAmounts.push(armmUSDCBalance);
      usdcBorrowAmounts.push(debtUSDCBalance);
      wxdaiSupplyAmounts.push(armmWXDAIBalance);
      wxdaiBorrowAmounts.push(debtWXDAIBalance);
    } else {
      // Si le dernier point est déjà pour aujourd'hui, mettre à jour ce point avec les soldes actuels
      console.log("Mise à jour du point d'aujourd'hui");
      const lastIndex = dates.length - 1;
      usdcSupplyAmounts[lastIndex] = armmUSDCBalance;
      usdcBorrowAmounts[lastIndex] = debtUSDCBalance;
      wxdaiSupplyAmounts[lastIndex] = armmWXDAIBalance;
      wxdaiBorrowAmounts[lastIndex] = debtWXDAIBalance;
    }
    
    // Console log des tableaux finaux pour débogage
    console.log("USDC Supply Points:", usdcSupplyAmounts);
    console.log("USDC Borrow Points:", usdcBorrowAmounts);
    console.log("WXDAI Supply Points:", wxdaiSupplyAmounts);
    console.log("WXDAI Borrow Points:", wxdaiBorrowAmounts);

    // Créer les données pour le graphique USDC
    setUsdcChartData({
      labels: dates,
      datasets: [
        {
          label: 'Liquidités USDC',
          data: usdcSupplyAmounts,
          borderColor: 'rgb(75, 192, 120)',
          backgroundColor: 'rgba(75, 192, 120, 0.2)',
          tension: 0.1
        },
        {
          label: 'Dette USDC',
          data: usdcBorrowAmounts,
          borderColor: 'rgb(220, 53, 69)',
          backgroundColor: 'rgba(220, 53, 69, 0.2)',
          tension: 0.1
        }
      ]
    });

    // Créer les données pour le graphique WXDAI
    setWxdaiChartData({
      labels: dates,
      datasets: [
        {
          label: 'Liquidités WXDAI',
          data: wxdaiSupplyAmounts,
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.1
        },
        {
          label: 'Dette WXDAI',
          data: wxdaiBorrowAmounts,
          borderColor: 'rgb(255, 159, 64)',
          backgroundColor: 'rgba(255, 159, 64, 0.2)',
          tension: 0.1
        }
      ]
    });
  };

  // Nouvelle fonction pour générer les données du graphique de dette
  const generateDebtChartData = (debtDetails: any[]) => {
    if (debtDetails.length === 0) {
      setDailyCostsChartData(null);
      return;
    }

    // Préparer les données pour le graphique
    const labels = debtDetails.map(detail => {
      // Formatter la date pour l'affichage (YYYY-MM-DD)
      const year = detail.date.substring(0, 4);
      const month = detail.date.substring(4, 6);
      const day = detail.date.substring(6, 8);
      return `${year}-${month}-${day}`;
    });

    const debtAmounts = debtDetails.map(detail => detail.debt);
    const dailyInterestCosts = debtDetails.map(detail => detail.dailyInterest);

    setDailyCostsChartData({
      labels,
      datasets: [
        {
          label: 'Montant de la dette USDC',
          data: debtAmounts,
          backgroundColor: 'rgba(220, 53, 69, 0.2)',
          borderColor: 'rgba(220, 53, 69, 1)',
          borderWidth: 1,
          type: 'line',
          yAxisID: 'y1',
        },
        {
          label: 'Coût quotidien des intérêts USDC',
          data: dailyInterestCosts,
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
          type: 'bar',
          yAxisID: 'y',
        }
      ]
    });
  };

  // Options communes pour les graphiques
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${context.raw.toFixed(2)} USD`;
          }
        }
      }
    },
    scales: {
      y: { beginAtZero: true }
    }
  };

  // Options spécifiques pour l'histogramme
  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${context.raw.toFixed(6)} ${context.dataset.label.includes('USDC') ? 'USDC' : 'WXDAI'}`;
          }
        }
      },
      title: {
        display: true,
        text: 'Coûts journaliers des intérêts'
      }
    },
    scales: {
      x: { stacked: false },
      y: { 
        beginAtZero: true,
        title: {
          display: true,
          text: 'Coût journalier'
        }
      }
    }
  };

  // Options spécifiques pour l'histogramme combiné avec la ligne
  const debtChartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            if (context.datasetIndex === 0) {
              return `Dette: ${context.raw.toFixed(6)} USDC`;
            } else {
              return `Intérêt: ${context.raw.toFixed(6)} USDC`;
            }
          }
        }
      },
      title: {
        display: true,
        text: 'Évolution de la dette et des intérêts quotidiens'
      }
    },
    scales: {
      x: { stacked: false },
      y: { 
        beginAtZero: true,
        title: {
          display: true,
          text: 'Intérêt quotidien (USDC)'
        },
        position: 'left' as const,
      },
      y1: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Montant de la dette (USDC)'
        },
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
      }
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

  // Ajouter cette fonction pour la conversion correcte des soldes
  const parseTokenBalance = (amount: string, decimals: number): number => {
    // Pour les grands nombres, BigInt est plus précis que parseInt
    if (!amount || amount === '0') return 0;
    
    try {
      return Number(BigInt(amount) * BigInt(100) / BigInt(10 ** decimals)) / 100;
    } catch (error) {
      console.error("Erreur de conversion du solde:", error, "Montant:", amount);
      return 0;
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
    const tokenKey = RESERVE_TO_TOKEN[tokenAddress];
    return tokenKey ? TOKENS[tokenKey].symbol : 'Inconnu';
  };

  // Ajouter cette fonction pour calculer le total des montants
  const calculateTotalAmount = (transactions: TransactionWithType[]): string => {
    if (transactions.length === 0) return '0.00';
    
    const total = transactions.reduce((sum, tx) => {
      const amount = parseFloat(formatAmount(tx.amount, tx.reserve.id.substring(0, 42)));
      return sum + amount;
    }, 0);
    
    return total.toFixed(2);
  };

  // Ajout des fonctions de calcul des gains/coûts
  const calculateSupplyGains = (supplies: Transaction[], withdraws: Transaction[], currentBalance: string, decimals: number): { gains: number, details: string } => {
    // Convertir les montants en nombres
    const totalSupplies = supplies.reduce((sum, tx) => sum + parseFloat(formatAmount(tx.amount, tx.reserve.id.substring(0, 42))), 0);
    const totalWithdraws = withdraws.reduce((sum, tx) => sum + parseFloat(formatAmount(tx.amount, tx.reserve.id.substring(0, 42))), 0);
    const currentBalanceNum = parseFloat(formatTokenAmount(currentBalance, decimals));
    
    // Calculer les gains
    let gains = 0;
    let details = "";
    
    if (currentBalanceNum === 0) {
      // Cas où il n'y a plus de dépôts
      gains = totalWithdraws - totalSupplies;
      details = `Calcul: Somme des retraits (${totalWithdraws.toFixed(2)}) - Somme des dépôts (${totalSupplies.toFixed(2)})`;
    } else {
      // Cas où il y a encore des dépôts
      gains = currentBalanceNum - totalSupplies + totalWithdraws;
      details = `Calcul: Solde actuel (${currentBalanceNum.toFixed(2)}) - Somme des dépôts (${totalSupplies.toFixed(2)}) + Somme des retraits (${totalWithdraws.toFixed(2)})`;
    }
    
    return { gains, details };
  };

  const calculateBorrowCosts = (borrows: Transaction[], repays: Transaction[], currentDebt: string, decimals: number): { costs: number, details: string } => {
    // Convertir les montants en nombres
    const totalBorrows = borrows.reduce((sum, tx) => sum + parseFloat(formatAmount(tx.amount, tx.reserve.id.substring(0, 42))), 0);
    const totalRepays = repays.reduce((sum, tx) => sum + parseFloat(formatAmount(tx.amount, tx.reserve.id.substring(0, 42))), 0);
    const currentDebtNum = parseFloat(formatTokenAmount(currentDebt, decimals));
    
    // Calculer les coûts
    const costs = totalRepays + currentDebtNum - totalBorrows;
    const details = `Calcul: Somme des remboursements (${totalRepays.toFixed(2)}) + Dette actuelle (${currentDebtNum.toFixed(2)}) - Somme des emprunts (${totalBorrows.toFixed(2)})`;
    
    return { costs, details };
  };

  // Fonction pour télécharger les coûts journaliers au format CSV
  const downloadDailyCostsCSV = () => {
    if (usdcDailyDetails.length === 0 && wxdaiDailyDetails.length === 0) {
      alert("Aucune donnée de coût disponible pour télécharger");
      return;
    }
    
    const csv = generateDailyCostsCSV(usdcDailyDetails, wxdaiDailyDetails);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `couts_journaliers_${address.substring(0, 8)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Ajouter d'un composant Error
  const ErrorMessage = ({ message }: { message: string }) => (
    <div className="my-4 p-4 bg-red-100 text-red-700 rounded-md">
      {message}
    </div>
  );

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
            
            {/* Résumé des soldes */}
            <div className="mb-8 p-4 bg-white rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-semibold">Soldes actuels :</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium text-green-700">Liquidités fournies :</h5>
                  <div className="ml-4 mt-2">
                    <p><span className="font-medium">armmUSDC :</span> {formatTokenAmount(tokenBalances.armmUSDC, 6)} USDC</p>
                    <p><span className="font-medium">armmWXDAI :</span> {formatTokenAmount(tokenBalances.armmWXDAI, 18)} WXDAI</p>
                    <p className="mt-1 text-green-600 font-semibold">Total : {
                      (parseFloat(formatTokenAmount(tokenBalances.armmUSDC, 6)) + 
                      parseFloat(formatTokenAmount(tokenBalances.armmWXDAI, 18))).toFixed(2)
                    } USD</p>
                  </div>
                </div>
                <div>
                  <h5 className="font-medium text-red-700">Dettes :</h5>
                  <div className="ml-4 mt-2">
                    <p><span className="font-medium">debtUSDC :</span> {formatTokenAmount(tokenBalances.debtUSDC, 6)} USDC</p>
                    <p><span className="font-medium">debtWXDAI :</span> {formatTokenAmount(tokenBalances.debtWXDAI, 18)} WXDAI</p>
                    <p className="mt-1 text-red-600 font-semibold">Total : {
                      (parseFloat(formatTokenAmount(tokenBalances.debtUSDC, 6)) + 
                      parseFloat(formatTokenAmount(tokenBalances.debtWXDAI, 18))).toFixed(2)
                    } USD</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Résumé des gains et coûts d'intérêts */}
            <div className="mb-8 p-4 bg-white rounded-lg shadow">
              <h4 className="text-lg font-semibold mb-4">Synthèse USDC :</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Total des emprunts et remboursements USDC */}
                <div className="p-3 border rounded-lg border-blue-100">
                  {(() => {
                    const usdcBorrows = borrows.filter(tx => 
                      getTokenSymbol(tx.reserve.id).includes('USDC')
                    );
                    const usdcRepays = repays.filter(tx => 
                      getTokenSymbol(tx.reserve.id).includes('USDC')
                    );
                    
                    // Calculer le total des emprunts (borrows)
                    const totalBorrows = usdcBorrows.reduce(
                      (sum, tx) => sum + parseFloat(formatAmount(tx.amount, tx.reserve.id.substring(0, 42))), 
                      0
                    );
                    
                    // Calculer le total des remboursements (repays)
                    const totalRepays = usdcRepays.reduce(
                      (sum, tx) => sum + parseFloat(formatAmount(tx.amount, tx.reserve.id.substring(0, 42))), 
                      0
                    );
                    
                    // Dette actuelle
                    const currentDebt = parseFloat(formatTokenAmount(tokenBalances.debtUSDC, 6));
                    
                    return (
                      <div>
                        <h5 className="font-medium text-blue-800 mb-2">Récapitulatif des emprunts USDC</h5>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Total des emprunts:</span>
                            <span className="font-semibold">{totalBorrows.toFixed(2)} USDC</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Total des remboursements:</span>
                            <span className="font-semibold">{totalRepays.toFixed(2)} USDC</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Dette actuelle:</span>
                            <span className="font-semibold">{currentDebt.toFixed(2)} USDC</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Coûts des intérêts:</span>
                            <span className="font-semibold text-red-600">{totalInterestCost.toFixed(6)} USDC</span>
                          </div>
                          <div className="mt-2 pt-2 border-t flex justify-between items-center">
                            <span className="text-sm font-medium">Coût total de la dette:</span>
                            <span className="font-semibold text-red-600">
                              {(totalRepays + currentDebt - totalBorrows + totalInterestCost).toFixed(6)} USDC
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
            
            {/* Histogramme des coûts journaliers */}
            <div className="mb-8 p-4 bg-white rounded-lg shadow">
              <h4 className="text-lg font-semibold mb-4">Évolution de la dette et des intérêts :</h4>
              
              {dailyCostsChartData ? (
                <div className="h-96">
                  <Bar data={dailyCostsChartData} options={debtChartOptions} />
                </div>
              ) : (
                <p className="text-center text-gray-500 py-10">Aucune donnée de dette disponible</p>
              )}
              
              <div className="mt-4 p-2 bg-gray-50 rounded text-sm text-gray-700">
                <p><strong>Note :</strong> Ce graphique montre l'évolution de la dette (ligne rouge) et le coût quotidien des intérêts (barres bleues) pour vos emprunts en USDC.</p>
              </div>
            </div>
            
            {/* Tableau des détails journaliers de la dette avec bouton pour afficher/cacher */}
            <div className="mb-8 p-4 bg-white rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-semibold">Détails journaliers du calcul de la dette USDC</h4>
                <button 
                  onClick={() => setShowDailyDebt(!showDailyDebt)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md flex items-center"
                  aria-label={showDailyDebt ? "Cacher les détails" : "Afficher les détails"}
                  tabIndex={0}
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`h-5 w-5 mr-2 transition-transform ${showDailyDebt ? 'rotate-180' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  {showDailyDebt ? "Cacher les détails" : "Afficher les détails"}
                </button>
              </div>
              
              {showDailyDebt && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Montant Dette
                        </th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          APR
                        </th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Taux Journalier
                        </th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Intérêt Journalier
                        </th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Intérêt Cumulé
                        </th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Transaction
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dailyDebtDetails
                        .slice()
                        .reverse() // Afficher du plus récent au plus ancien
                        .map((detail, index) => {
                          // Format de la date
                          const year = detail.date.substring(0, 4);
                          const month = detail.date.substring(4, 6);
                          const day = detail.date.substring(6, 8);
                          const date = `${year}-${month}-${day}`;
                          
                          return (
                            <tr key={detail.date} className={detail.transactionType ? 'bg-yellow-50' : ''}>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                {date}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                {detail.debt.toFixed(2)} USDC
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                {detail.apr !== undefined ? detail.apr.toFixed(6) : '0.000000'}%
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                {(detail.dailyRate * 100).toFixed(6)}%
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                {detail.dailyInterest.toFixed(2)} USDC
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                {detail.totalInterest.toFixed(2)} USDC
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">
                                {detail.transactionAmount ? (
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    detail.transactionType === 'borrow' 
                                      ? 'bg-purple-100 text-purple-800' 
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {detail.transactionType === 'borrow' ? 'Emprunt' : 'Remboursement'} {detail.transactionAmount.toFixed(2)} USDC
                                  </span>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {/* Tableau des taux journaliers avec bouton pour afficher/cacher */}
            <div className="mb-8 p-4 bg-white rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-semibold">Taux journaliers USDC (données brutes de l'API)</h4>
                <button 
                  onClick={() => setShowRawRates(!showRawRates)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md flex items-center"
                  aria-label={showRawRates ? "Cacher les taux" : "Afficher les taux"}
                  tabIndex={0}
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`h-5 w-5 mr-2 transition-transform ${showRawRates ? 'rotate-180' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  {showRawRates ? "Cacher les taux" : "Afficher les taux"}
                </button>
              </div>
              
              {showRawRates && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Taux (variableBorrowRate_avg)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {rawRates
                        .slice()
                        .sort((a, b) => {
                          // Trier par date décroissante
                          const dateA = new Date(a.year, a.month, a.day);
                          const dateB = new Date(b.year, b.month, b.day);
                          return dateB.getTime() - dateA.getTime();
                        })
                        .map((rate, index) => {
                          // Format de la date
                          const year = rate.year;
                          const month = String(rate.month + 1).padStart(2, '0'); // Ajouter +1 car mois est indexé de 0
                          const day = String(rate.day).padStart(2, '0');
                          const date = `${year}-${month}-${day}`;
                          
                          return (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {date}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {(rate.variableBorrowRate_avg * 100).toFixed(6)}%
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {/* Compteurs de transactions */}
            <div className="mb-8 p-4 bg-white rounded-lg shadow">
              <h4 className="text-lg font-semibold mb-4">Résumé des transactions :</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-blue-800 font-semibold">Dépôts</div>
                  <div className="text-2xl font-bold text-blue-600">{supplies.length}</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-green-800 font-semibold">Retraits</div>
                  <div className="text-2xl font-bold text-green-600">{withdraws.length}</div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="text-purple-800 font-semibold">Emprunts</div>
                  <div className="text-2xl font-bold text-purple-600">{borrows.length}</div>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg">
                  <div className="text-amber-800 font-semibold">Remboursements</div>
                  <div className="text-2xl font-bold text-amber-600">{repays.length}</div>
                </div>
              </div>
              
              {/* Bouton de téléchargement CSV */}
              <div className="mt-6 flex justify-center">
                {dailyDebtDetails.length > 0 && (
                  <button 
                    onClick={() => {
                      // Générer un CSV à partir des détails journaliers
                      const headers = 'Date,Montant Dette,APR,Taux Journalier,Interet Journalier,Interet Cumule,Transaction\n';
                      const rows = dailyDebtDetails.map(detail => {
                        const year = detail.date.substring(0, 4);
                        const month = detail.date.substring(4, 6);
                        const day = detail.date.substring(6, 8);
                        const date = `${year}-${month}-${day}`;
                        
                        // S'assurer que les taux sont bien en pourcentage
                        const aprPercentage = detail.apr !== undefined ? detail.apr.toFixed(6) + '%' : '0.000000%';
                        const ratePercentage = (detail.dailyRate * 100).toFixed(6) + '%';
                        
                        // Formater les montants USDC avec 2 décimales pour meilleure lisibilité
                        const debtAmount = detail.debt.toFixed(2);
                        const dailyInterest = detail.dailyInterest.toFixed(2);
                        const totalInterest = detail.totalInterest.toFixed(2);
                        
                        const transactionInfo = detail.transactionAmount 
                          ? `${detail.transactionType === 'borrow' ? 'Emprunt' : 'Remboursement'} ${detail.transactionAmount.toFixed(2)}`
                          : '';
                        
                        return `${date},${debtAmount},${aprPercentage},${ratePercentage},${dailyInterest},${totalInterest},${transactionInfo}`;
                      }).join('\n');
                      
                      const csvContent = headers + rows;
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.setAttribute('href', url);
                      link.setAttribute('download', `dette_journaliere_${address.substring(0, 8)}.csv`);
                      link.style.visibility = 'hidden';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md flex items-center"
                    aria-label="Télécharger le CSV des détails de la dette journalière"
                    tabIndex={0}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Télécharger le détail de la dette journalière (CSV)
                  </button>
                )}
              </div>
            </div>
            
            {/* Tableau des transactions */}
            {allTransactions.length > 0 ? (
              <div className="overflow-x-auto">
                <h4 className="text-lg font-semibold mb-4">Toutes les transactions ({allTransactions.length})</h4>
                
                {/* Calcul de la durée d'activité en jours */}
                {(() => {
                  const oldestTransaction = [...allTransactions].sort((a, b) => a.timestamp - b.timestamp)[0];
                  const oldestDate = new Date(oldestTransaction.timestamp * 1000);
                  const today = new Date();
                  const diffTime = Math.abs(today.getTime() - oldestDate.getTime());
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                  return (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                      <span className="font-medium">Nombre de jours d'activité :</span> {diffDays} jours
                      <span className="ml-4 text-gray-600">
                        (Depuis le {oldestDate.toLocaleDateString('fr-FR')} jusqu'à aujourd'hui)
                      </span>
                    </div>
                  );
                })()}
                
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        #
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center">
                          <span className="mr-2">Type</span>
                          <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="rounded text-xs border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                          >
                            <option value="all">Tous</option>
                            <option value="supply">Dépôt</option>
                            <option value="withdraw">Retrait</option>
                            <option value="borrow">Emprunt</option>
                            <option value="repay">Remboursement</option>
                          </select>
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center">
                          <span className="mr-2">Token</span>
                          <select
                            value={tokenFilter}
                            onChange={(e) => setTokenFilter(e.target.value)}
                            className="rounded text-xs border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                          >
                            <option value="all">Tous</option>
                            <option value="USDC">USDC</option>
                            <option value="WXDAI">WXDAI</option>
                          </select>
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Montant
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hash de transaction
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {/* Ligne de total */}
                    {(() => {
                      // Filtrer les transactions selon les critères actuels
                      const filteredTransactions = allTransactions.filter(tx => {
                        // Filtre par type
                        if (typeFilter !== 'all' && tx.transactionType !== typeFilter) return false;
                        
                        // Filtre par token
                        if (tokenFilter !== 'all') {
                          const tokenSymbol = getTokenSymbol(tx.reserve.id);
                          if (!tokenSymbol.includes(tokenFilter)) return false;
                        }
                        
                        return true;
                      });
                      
                      if (filteredTransactions.length > 0) {
                        return (
                          <tr className="bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">-</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                              {typeFilter === 'all' ? '-' : getTransactionTypeLabel(typeFilter)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                              {tokenFilter === 'all' ? '-' : tokenFilter}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                              {calculateTotalAmount(filteredTransactions)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">-</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">-</td>
                          </tr>
                        );
                      }
                      return null;
                    })()}
                    
                    {/* Lignes de transactions */}
                    {allTransactions
                      .filter(tx => {
                        // Filtre par type
                        if (typeFilter !== 'all' && tx.transactionType !== typeFilter) return false;
                        
                        // Filtre par token
                        if (tokenFilter !== 'all') {
                          const tokenSymbol = getTokenSymbol(tx.reserve.id);
                          if (!tokenSymbol.includes(tokenFilter)) return false;
                        }
                        
                        return true;
                      })
                      .map((tx, index) => {
                        const tokenSymbol = getTokenSymbol(tx.reserve.id);
                        
                        return (
                          <tr key={tx.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              #{index + 1}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTransactionTypeStyle(tx.transactionType)}`}>
                                {getTransactionTypeLabel(tx.transactionType)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {tokenSymbol}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatAmount(tx.amount, tx.reserve.id.substring(0, 42))}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatTimestamp(tx.timestamp)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <a
                                href={`https://gnosisscan.io/tx/${tx.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-700"
                                aria-label={`Voir la transaction ${tx.id} sur Gnosisscan`}
                              >
                                {tx.id.substring(0, 10)}...
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Aucune transaction trouvée pour cette adresse.</p>
              </div>
            )}
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