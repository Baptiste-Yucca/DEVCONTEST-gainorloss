import React, { useState } from 'react';
import Head from 'next/head';
import Chart from '../components/Chart';
import TransactionsTable from '../components/TransactionsTable';
import FinancialSummary from '../components/FinancialSummary';

// Types pour les données de l'API V3
interface DailyDetail {
  date: string;
  timestamp: number;
  debt?: string;
  supply?: string;
  dailyRate: number;
  apr: number;
  periodInterest: string;
  totalInterest: string;
  transactionAmount?: string;
  transactionType?: string;
  source?: 'real' | 'estimated'; // Ajouter un champ pour indiquer la source
}

// Types pour les données de l'API V2
interface V2Transaction {
  txHash: string;
  amount: string;
  amountFormatted: number;
  timestamp: number;
  type: 'borrow' | 'repay' | 'deposit' | 'withdraw';
  reserve: 'rmmWXDAI';
}

// Types pour les balances des tokens
interface TokenBalance {
  token: string;
  balance: string;
  symbol: string;
  decimals: number;
}

interface TokenBalances {
  // SupplyTokens
  armmUSDC: TokenBalance;
  armmWXDAI: TokenBalance;
  // DebtTokens
  debtUSDC: TokenBalance;
  debtWXDAI: TokenBalance;
}

// ✅ Utiliser la même interface pour V2 et V3
interface ApiResponse {
  success: boolean;
  data: {
    results: Array<{
      address: string;
      success: boolean;
      data: {
        interests: {
          USDC?: {
            token: string;
            borrow: {
              totalInterest: string;
              dailyDetails: DailyDetail[];
            };
            supply: {
              totalInterest: string;
              dailyDetails: DailyDetail[];
            };
            summary: {
              totalBorrowInterest: string;
              totalSupplyInterest: string;
              netInterest: string;
            };
          };
          WXDAI: {
            token: string;
            borrow: {
              totalInterest: string;
              dailyDetails: DailyDetail[];
            };
            supply: {
              totalInterest: string;
              dailyDetails: DailyDetail[];
            };
            summary: {
              totalBorrowInterest: string;
              totalSupplyInterest: string;
              netInterest: string;
            };
          };
        };
        transactions?: {
          USDC: {
            debt: Array<{
              txHash: string;
              amount: string;
              timestamp: number;
              type: string;
            }>;
            supply: Array<{
              txHash: string;
              amount: string;
              timestamp: number;
              type: string;
            }>;
          };
          WXDAI: {
            debt: Array<{
              txHash: string;
              amount: string;
              timestamp: number;
              type: string;
            }>;
            supply: Array<{
              txHash: string;
              amount: string;
              timestamp: number;
              type: string;
            }>;
          };
        };
      };
    }>;
  };
}

export default function Home() {
  const [address, setAddress] = useState('');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [dataV2, setDataV2] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenBalances, setTokenBalances] = useState<TokenBalances | null>(null);
  const [isV3Collapsed, setIsV3Collapsed] = useState(true);
  // Ajouter un état pour contrôler l'affichage des points estimés
  // const [showEstimatedPoints, setShowEstimatedPoints] = useState(true);

  // Fonction pour formater les montants (conversion depuis base units)
  const formatAmount = (amount: string, decimals = 6): number => {
    return parseFloat(amount) / Math.pow(10, decimals);
  };

  // Fonction pour formater les dates YYYYMMDD
  const formatDate = (dateStr: string): string => {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${day}/${month}/${year}`;
  };

  // Corriger la fonction prepareChartData pour filtrer selon showEstimatedPoints
  const prepareChartData = (dailyDetails: DailyDetail[], valueKey: 'debt' | 'supply', decimals = 6) => {
    if (!dailyDetails || dailyDetails.length === 0) return [];
    
    return dailyDetails.map(detail => ({
      date: detail.date,
      value: formatAmount(detail[valueKey] || '0', decimals),
      formattedDate: formatDate(detail.date)
    }));
  };

  // Fonction pour préparer les données V2 pour Recharts
  const prepareV2ChartData = (transactions: V2Transaction[]) => {
    // Calculer la dette cumulée pour V2 (avec support des valeurs négatives)
    let cumulativeDebt = 0;
    const chartData: Array<{date: string; value: number; formattedDate: string; type?: string; amount?: number; timestamp?: number}> = [];
    
    // Trier les transactions par timestamp
    const sortedTransactions = [...transactions].sort((a, b) => a.timestamp - b.timestamp);
    
    for (const tx of sortedTransactions) {
      if (tx.type === 'borrow') {
        cumulativeDebt += tx.amountFormatted;
      } else if (tx.type === 'repay') {
        cumulativeDebt -= tx.amountFormatted;
      }
      
      chartData.push({
        date: new Date(tx.timestamp * 1000).toISOString().split('T')[0],
        value: cumulativeDebt, // Utiliser la dette cumulée au lieu du montant individuel
        formattedDate: new Date(tx.timestamp * 1000).toLocaleDateString('fr-CH'),
        type: tx.type,
        amount: tx.amountFormatted,
        timestamp: tx.timestamp
      });
    }
    
    return chartData;
  };

  // Fonction pour préparer toutes les transactions pour le tableau
  const prepareAllTransactions = () => {
    const allTransactions: any[] = [];

    // Ajouter les transactions V3
    if (data?.data?.results?.[0]?.data?.transactions) {
      const v3Transactions = data.data.results[0].data.transactions;
      
      // Transactions USDC V3
      if (v3Transactions.USDC) {
        v3Transactions.USDC.debt.forEach((tx: any) => {
          allTransactions.push({
            timestamp: tx.timestamp,
            amount: tx.amount,
            type: tx.type,
            token: 'USDC',
            txHash: tx.txHash,
            version: 'V3'
          });
        });
        
        v3Transactions.USDC.supply.forEach((tx: any) => {
          allTransactions.push({
            timestamp: tx.timestamp,
            amount: tx.amount,
            type: tx.type,
            token: 'USDC',
            txHash: tx.txHash,
            version: 'V3'
          });
        });
      }

      // Transactions WXDAI V3
      if (v3Transactions.WXDAI) {
        v3Transactions.WXDAI.debt.forEach((tx: any) => {
          allTransactions.push({
            timestamp: tx.timestamp,
            amount: tx.amount,
            type: tx.type,
            token: 'WXDAI',
            txHash: tx.txHash,
            version: 'V3'
          });
        });
        
        v3Transactions.WXDAI.supply.forEach((tx: any) => {
          allTransactions.push({
            timestamp: tx.timestamp,
            amount: tx.amount,
            type: tx.type,
            token: 'WXDAI',
            txHash: tx.txHash,
            version: 'V3'
          });
        });
      }
    }

    // ✅ Ajouter les transactions V2
    if (dataV2?.data?.results?.[0]?.data?.transactions?.WXDAI) {
      // ✅ Même chemin que V3 !
      const v2Data = dataV2.data.results[0].data.transactions.WXDAI;
      
      // Transactions de dette WXDAI V2
      v2Data.debt.forEach((tx: any) => {
        allTransactions.push({
          timestamp: tx.timestamp,
          amount: tx.amount,
          type: tx.type,
          token: 'WXDAI',
          txHash: tx.txHash,
          version: 'V2'
        });
      });

      // Transactions de supply WXDAI V2
      v2Data.supply.forEach((tx: any) => {
        allTransactions.push({
          timestamp: tx.timestamp,
          amount: tx.amount,
          type: tx.type,
          token: 'WXDAI',
          txHash: tx.txHash,
          version: 'V2'
        });
      });
    }

    // Trier par timestamp décroissant (plus récent en premier)
    return allTransactions.sort((a, b) => b.timestamp - a.timestamp);
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address.trim()) {
      alert('Veuillez saisir une adresse');
      return;
    }

    // Validation basique de l'adresse EVM
    if (!/^0x[a-fA-F0-9]{40}$/.test(address.trim())) {
      alert('Adresse EVM invalide (format: 0x...)');
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const apiUrl = `${backendUrl}/api/rmm/v3/${address.trim()}`;
      console.log('🚀 Appel API vers:', apiUrl);
      
      const response = await fetch(apiUrl);
      console.log('📡 Réponse API:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ Données reçues:', result);
      setData(result);
      
      // Récupérer les données RMM v2
      console.log('🔄 Récupération des données RMM v2...');
      try {
        const v2Response = await fetch(`${backendUrl}/api/rmm/v2/${address.trim()}`);
        if (v2Response.ok) {
          const v2Result = await v2Response.json();
          console.log('✅ Données RMM v2 reçues:', v2Result);
          setDataV2(v2Result);
        } else {
          console.log('⚠️ Erreur lors de la récupération des données RMM v2');
        }
      } catch (v2Error) {
        console.log('⚠️ Erreur lors de la récupération des données RMM v2:', v2Error);
      }
      
      // Récupérer les balances des tokens (même si pas de données)
      console.log('💰 Récupération des balances des tokens...');
      try {
        const balances = await fetchTokenBalances(address.trim());
        setTokenBalances(balances);
        console.log('✅ Balances récupérées:', balances);
      } catch (balanceError) {
        console.error('❌ Erreur lors de la récupération des balances:', balanceError);
        // En cas d'erreur, on garde tokenBalances à null pour afficher "N/A" dans les graphiques
      }
    } catch (err) {
      console.error('❌ Erreur lors de la récupération des données:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour récupérer les balances des tokens via l'API backend RPC
  const fetchTokenBalances = async (userAddress: string): Promise<TokenBalances> => {
    try {
      console.log('🚀 Récupération des balances via API backend RPC...');
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/balances/rpc/${userAddress}`);
      
      if (!response.ok) {
        throw new Error(`Erreur API backend: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la récupération des balances');
      }
      
      // Convertir le format de réponse du backend vers le format attendu par le frontend
      const backendBalances = result.data.balances;
      
      return {
        armmUSDC: {
          token: backendBalances.armmUSDC.token,
          balance: backendBalances.armmUSDC.formatted,
          symbol: backendBalances.armmUSDC.symbol,
          decimals: backendBalances.armmUSDC.decimals
        },
        armmWXDAI: {
          token: backendBalances.armmWXDAI.token,
          balance: backendBalances.armmWXDAI.formatted,
          symbol: backendBalances.armmWXDAI.symbol,
          decimals: backendBalances.armmWXDAI.decimals
        },
        debtUSDC: {
          token: backendBalances.debtUSDC.token,
          balance: backendBalances.debtUSDC.formatted,
          symbol: backendBalances.debtUSDC.symbol,
          decimals: backendBalances.debtUSDC.decimals
        },
        debtWXDAI: {
          token: backendBalances.debtWXDAI.token,
          balance: backendBalances.debtWXDAI.formatted,
          symbol: backendBalances.debtWXDAI.symbol,
          decimals: backendBalances.debtWXDAI.decimals
        }
      };
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des balances RPC:', error);
      
      // Fallback vers l'ancienne API en cas d'erreur
      console.log('🔄 Fallback vers l\'API V3...');
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
        const fallbackResponse = await fetch(`${backendUrl}/api/balances/v3/${userAddress}`);
        
        if (fallbackResponse.ok) {
          const fallbackResult = await fallbackResponse.json();
          if (fallbackResult.success) {
            const backendBalances = fallbackResult.data.balances;
            return {
              armmUSDC: {
                token: backendBalances.armmUSDC.token,
                balance: backendBalances.armmUSDC.formatted,
                symbol: backendBalances.armmUSDC.symbol,
                decimals: backendBalances.armmUSDC.decimals
              },
              armmWXDAI: {
                token: backendBalances.armmWXDAI.token,
                balance: backendBalances.armmWXDAI.formatted,
                symbol: backendBalances.armmWXDAI.symbol,
                decimals: backendBalances.armmWXDAI.decimals
              },
              debtUSDC: {
                token: backendBalances.debtUSDC.token,
                balance: backendBalances.debtUSDC.formatted,
                symbol: backendBalances.debtUSDC.symbol,
                decimals: backendBalances.debtUSDC.decimals
              },
              debtWXDAI: {
                token: backendBalances.debtWXDAI.token,
                balance: backendBalances.debtWXDAI.formatted,
                symbol: backendBalances.debtWXDAI.symbol,
                decimals: backendBalances.debtWXDAI.decimals
              }
            };
          }
        }
      } catch (fallbackError) {
        console.error('❌ Erreur lors du fallback:', fallbackError);
      }
      
      // Retourner des balances à 0 en cas d'erreur
      return {
        armmUSDC: {
          token: '0xed56f76e9cbc6a64b821e9c016eafbd3db5436d1',
          balance: '0',
          symbol: 'armmUSDC',
          decimals: 6
        },
        armmWXDAI: {
          token: '0x0ca4f5554dd9da6217d62d8df2816c82bba4157b',
          balance: '0',
          symbol: 'armmWXDAI',
          decimals: 18
        },
        debtUSDC: {
          token: '0x69c731aE5f5356a779f44C355aBB685d84e5E9e6',
          balance: '0',
          symbol: 'debtUSDC',
          decimals: 6
        },
        debtWXDAI: {
          token: '0x9908801dF7902675C3FEDD6Fea0294D18D5d5d34',
          balance: '0',
          symbol: 'debtWXDAI',
          decimals: 18
        }
      };
    }
  };

  const resetForm = () => {
    setAddress('');
    setData(null);
    setDataV2(null);
    setError(null);
    setLoading(false);
    setTokenBalances(null);
  };

  // Écran de chargement
  if (loading) {
    return (
      <>
        <Head>
          <title>RMM Analytics - Analysis in progress</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center max-w-md">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-200 border-t-blue-500 mx-auto mb-6"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Analysis in progress</h2>
            <p className="text-gray-600 text-sm">RMM data recovery for {address}</p>
          </div>
        </div>
      </>
    );
  }

  // Si on a des données ou une erreur, afficher les résultats
  if (data || error) {
    const result = data?.data?.results?.[0];
    const usdcData = result?.data?.interests?.USDC;
    const wxdaiData = result?.data?.interests?.WXDAI;
    
    // ✅ NOUVEAU: Récupérer directement depuis les derniers points
    const usdcLastDebtPoint = usdcData?.borrow?.dailyDetails?.[usdcData.borrow.dailyDetails.length - 1];
    const usdcLastSupplyPoint = usdcData?.supply?.dailyDetails?.[usdcData.supply.dailyDetails.length - 1];

    const wxdaiLastDebtPoint = wxdaiData?.borrow?.dailyDetails?.[wxdaiData.borrow.dailyDetails.length - 1];
    const wxdaiLastSupplyPoint = wxdaiData?.supply?.dailyDetails?.[wxdaiData.supply.dailyDetails.length - 1];

    // ✅ NOUVEAU: Calculer les valeurs finales
    const usdcTotalDebtInterest = usdcLastDebtPoint ? parseFloat(usdcLastDebtPoint.totalInterest) : 0;
    const usdcTotalSupplyInterest = usdcLastSupplyPoint ? parseFloat(usdcLastSupplyPoint.totalInterest) : 0;
    const usdcNetInterest = usdcTotalSupplyInterest - usdcTotalDebtInterest;

    const wxdaiTotalDebtInterest = wxdaiLastDebtPoint ? parseFloat(wxdaiLastDebtPoint.totalInterest) : 0;
    const wxdaiTotalSupplyInterest = wxdaiLastSupplyPoint ? parseFloat(wxdaiLastSupplyPoint.totalInterest) : 0;
    const wxdaiNetInterest = wxdaiTotalSupplyInterest - wxdaiTotalDebtInterest;

    const usdcBorrowDetails = usdcData?.borrow?.dailyDetails || [];
    const usdcSupplyDetails = usdcData?.supply?.dailyDetails || [];
    const wxdaiBorrowDetails = wxdaiData?.borrow?.dailyDetails || [];
    const wxdaiSupplyDetails = wxdaiData?.supply?.dailyDetails || [];

    return (
      <>
        <Head>
          <title>RMM Analytics</title>
        </Head>

        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
            {/* ✅ HEADER: Responsive avec flex-col sur mobile, flex-row sur desktop */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="text-center sm:text-left">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">RMM Analytics</h1>
                  <p className="text-sm sm:text-base text-gray-600">
                    Address: <span className="font-mono bg-gray-100 px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm break-all">{address}</span>
                  </p>
                </div>
                <button 
                  onClick={resetForm}
                  className="w-full sm:w-auto bg-gray-900 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl hover:bg-gray-800 transition-colors font-medium text-sm sm:text-base"
                >
                  Try another address
                </button>
              </div>
            </div>
            <FinancialSummary
              usdcData={usdcData}
              wxdaiData={wxdaiData}
              v2Data={dataV2?.data?.results?.[0]?.data?.interests?.WXDAI}
              userAddress={address}
              transactions={prepareAllTransactions()} 
            />

            {/* Erreur */}
            {error && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
                <div className="text-center">
                  <div className="text-red-500 text-6xl mb-4">⚠️</div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur</h2>
                  <p className="text-gray-600">{error}</p>
                </div>
              </div>
            )}

            
            {usdcData && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">USDC Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-red-50 border border-red-100 p-6 rounded-xl">
                    <h3 className="text-sm font-medium text-red-700 mb-2">Borrow Interest</h3>
                    <p className="text-3xl font-bold text-red-600">
                      {formatAmount(usdcTotalDebtInterest).toFixed(2)} USDC
                    </p>
                  </div>
                  <div className="bg-green-50 border border-green-100 p-6 rounded-xl">
                    <h3 className="text-sm font-medium text-green-700 mb-2">Supply Interest</h3>
                    <p className="text-3xl font-bold text-green-600">
                      {formatAmount(usdcTotalSupplyInterest).toFixed(2)} USDC
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl">
                    <h3 className="text-sm font-medium text-blue-700 mb-2">PnL Net</h3>
                    <p className={`text-3xl font-bold ${usdcNetInterest >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatAmount(usdcNetInterest).toFixed(2)} USDC
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Graphiques USDC */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Graphique Dette USDC */}
              <Chart
                data={prepareChartData(usdcBorrowDetails, 'debt', 6)}
                title="USDC Debt Evolution"
                color="#dc2626"
                type="line"
                tokenAddress="0x69c731aE5f5356a779f44C355aBB685d84e5E9e6"
                userAddress={address}
              />

              {/* Graphique Supply USDC */}
              <Chart
                data={prepareChartData(usdcSupplyDetails, 'supply', 6)}
                title="USDC Supply Evolution"
                color="#059669"
                type="area"
                tokenAddress="0xed56f76e9cbc6a64b821e9c016eafbd3db5436d1"
                userAddress={address}
              />
            </div>

            {/* WXDAI Summary */}
            {wxdaiData && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">WXDAI Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-red-50 border border-red-100 p-6 rounded-xl">
                    <h3 className="text-sm font-medium text-red-700 mb-2">Borrow Interest</h3>
                    <p className="text-3xl font-bold text-red-600">
                      {formatAmount(wxdaiTotalDebtInterest, 18).toFixed(2)} WXDAI
                    </p>
                  </div>
                  <div className="bg-green-50 border border-green-100 p-6 rounded-xl">
                    <h3 className="text-sm font-medium text-green-700 mb-2">Supply Interest</h3>
                    <p className="text-3xl font-bold text-green-600">
                      {formatAmount(wxdaiTotalSupplyInterest, 18).toFixed(2)} WXDAI
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl">
                    <h3 className="text-sm font-medium text-blue-700 mb-2">PnL Net</h3>
                    <p className={`text-3xl font-bold ${wxdaiNetInterest >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatAmount(wxdaiNetInterest, 18).toFixed(2)} WXDAI
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Graphiques WXDAI */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Graphique Dette WXDAI */}
              <Chart
                data={prepareChartData(wxdaiBorrowDetails, 'debt', 18)}
                title="WXDAI Debt Evolution"
                color="#dc2626"
                type="line"
                tokenAddress="0x9908801dF7902675C3FEDD6Fea0294D18D5d5d34"
                userAddress={address}
              />
                    
              {/* Graphique Supply WXDAI */}
              <Chart
                data={prepareChartData(wxdaiSupplyDetails, 'supply', 18)}
                title="WXDAI Supply Evolution"
                color="#059669"
                type="area"
                tokenAddress="0x0ca4f5554dd9da6217d62d8df2816c82bba4157b"
                userAddress={address}
              />
            </div>

            {/* Graphiques RMM v2 - Montants */}
            {dataV2 && (
              <>
               
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">RMM v2 Transactions</h2>
                  
                  {/* Vérifier si le wallet a des données V2 */}
                  {!dataV2.data?.results?.[0]?.data?.interests?.WXDAI ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">😢</div>
                      <p className="text-lg text-gray-600">
                        This wallet is too young and has never known the V2 :'(
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Extraire les données V2 comme V3 */}
                      {(() => {
                        const v2Result = dataV2.data.results[0];
                        const v2WxdaiData = v2Result.data.interests.WXDAI;
                        const v2WxdaiBorrowDetails = v2WxdaiData.borrow.dailyDetails || [];
                        const v2WxdaiSupplyDetails = v2WxdaiData.supply.dailyDetails || [];
                        
                        return (
                          <>
                            {/* ✅ NOUVEAU: Résumé WXDAI V2 identique à V3 */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
                              <h2 className="text-2xl font-bold text-gray-900 mb-6">WXDAI Summary (V2)</h2>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-red-50 border border-red-100 p-6 rounded-xl">
                                  <h3 className="text-sm font-medium text-red-700 mb-2">Borrow Interest</h3>
                                  <p className="text-3xl font-bold text-red-600">
                                    {formatAmount(v2WxdaiData.borrow.totalInterest, 18).toFixed(2)} WXDAI
                                  </p>
                                </div>
                                <div className="bg-green-50 border border-green-100 p-6 rounded-xl">
                                  <h3 className="text-sm font-medium text-green-700 mb-2">Supply Interest</h3>
                                  <p className="text-3xl font-bold text-green-600">
                                    {formatAmount(v2WxdaiData.supply.totalInterest, 18).toFixed(2)} WXDAI
                                  </p>
                                </div>
                                <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl">
                                  <h3 className="text-sm font-medium text-blue-700 mb-2">PnL Net</h3>
                                  <p className={`text-3xl font-bold ${(parseFloat(v2WxdaiData.supply.totalInterest) - parseFloat(v2WxdaiData.borrow.totalInterest)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatAmount(parseFloat(v2WxdaiData.supply.totalInterest) - parseFloat(v2WxdaiData.borrow.totalInterest), 18).toFixed(2)} WXDAI
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Graphiques WXDAI v2 */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                              {/* Graphique Dette WXDAI v2 */}
                              <Chart
                                data={prepareChartData(v2WxdaiBorrowDetails, 'debt', 18)}
                                title="WXDAI Debt Evolution (v2)"
                                color="#f59e0b"
                                type="line"
                                tokenAddress="0x0ade75f269a054673883319baa50e5e0360a775f"
                                userAddress={address}
                              />

                              {/* Graphique Supply WXDAI v2 */}
                              <Chart
                                data={prepareChartData(v2WxdaiSupplyDetails, 'supply', 18)}
                                title="WXDAI Supply Evolution (v2)"
                                color="#3b82f6"
                                type="area"
                                tokenAddress="0x7349c9eaa538e118725a6130e0f8341509b9f8a0"
                                userAddress={address}
                              />
                            </div>
                          </>
                        );
                      })()}
                    </>
                  )}
              
              </>
            )}

            {/* Aucune donnée */}
            {data?.data.results.length === 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                <div className="text-gray-400 text-6xl mb-4">📊</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">No data</h2>
                <p className="text-gray-600">No RMM transaction found for this address</p>
              </div>
            )}

            {/* Tableau des transactions unifié */}
            {(data || dataV2) && prepareAllTransactions().length > 0 && (
              <TransactionsTable 
                transactions={prepareAllTransactions()}
                userAddress={address}
                title="Transactions"
                isCollapsed={isV3Collapsed}
                onToggleCollapse={() => setIsV3Collapsed(!isV3Collapsed)}
              />
            )}
          </div>
        </div>
      </>
    );
  }

  // Formulaire initial
  return (
    <>
      <Head>
        <title>RMM Analytics</title>
        <meta name="description" content="Analyze your RMM earnings and losses" />
      </Head>

      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 w-full max-w-md">
          {/* En-tête */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              RMM Analytics
            </h1>
            <p className="text-gray-600 text-lg">
            Analyze your RMM earnings and losses
            </p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-3">
                EVM address
              </label>
              <input
                type="text"
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="0x3f3994bb23c48204ddeb99aa6bf6dd275abf7a3f"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-gray-900"
              />
            </div>

            <button
              type="submit"
              disabled={!address.trim()}
              className="w-full bg-gray-900 text-white py-4 px-6 rounded-xl font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Analyze
            </button>
          </form>

          {/* Note */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-sm text-blue-800">
              💡 <strong>Info:</strong> Enter your EVM address to view your RMM transactions and calculate your earnigns/losses
            </p>
          </div>
        </div>
      </div>
    </>
  );
} 