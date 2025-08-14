import React, { useState } from 'react';
import Head from 'next/head';
import Chart from '../components/Chart';
import TransactionsTable from '../components/TransactionsTable';

// Types pour les données de l'API V3
interface DailyDetail {
  date: string;
  timestamp: number;
  debt?: string;
  supply?: string;
  dailyRate: number;
  apr: number;
  dailyInterest: string;
  totalInterest: string;
  transactionAmount?: string;
  transactionType?: string;
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

interface V2Transactions {
  USDC: {
    debt: V2Transaction[];
    supply: V2Transaction[];
  };
  WXDAI: {
    debt: V2Transaction[];
    supply: V2Transaction[];
  };
}

interface V2ApiResponse {
  success: boolean;
  data: {
    address: string;
    contract: string;
    subgraphUrl: string;
    stats: {
      USDC: { debt: number; supply: number; total: number };
      WXDAI: { debt: number; supply: number; total: number };
    };
    totals: {
      USDC: { debt: number; supply: number };
      WXDAI: { debt: number; supply: number };
    };
    transactions: V2Transactions;
    timestamp: string;
  };
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

interface ApiResponse {
  success: boolean;
  data: {
    results: Array<{
      address: string;
      success: boolean;
      data: {
        interests: {
          USDC: {
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
  const [dataV2, setDataV2] = useState<V2ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenBalances, setTokenBalances] = useState<TokenBalances | null>(null);
  const [isV3Collapsed, setIsV3Collapsed] = useState(false);
  const [isV2Collapsed, setIsV2Collapsed] = useState(false);

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

  // Fonction pour préparer les données pour Recharts (V3)
  const prepareChartData = (dailyDetails: DailyDetail[], valueKey: 'debt' | 'supply', decimals = 6) => {
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
        formattedDate: new Date(tx.timestamp * 1000).toLocaleDateString('fr-FR'),
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

    // Ajouter les transactions USDC V3
    if (data?.data?.results?.[0]?.data?.transactions?.USDC) {
      const usdcData = data.data.results[0].data.transactions.USDC;
      
      // Transactions de dette USDC
      usdcData.debt.forEach((tx: any) => {
        allTransactions.push({
          timestamp: tx.timestamp,
          amount: tx.amount,
          type: tx.type,
          token: 'USDC',
          txHash: tx.txHash,
          version: 'V3'
        });
      });

      // Transactions de supply USDC
      usdcData.supply.forEach((tx: any) => {
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

    // Ajouter les transactions WXDAI V3
    if (data?.data?.results?.[0]?.data?.transactions?.WXDAI) {
      const wxdaiData = data.data.results[0].data.transactions.WXDAI;
      
      // Transactions de dette WXDAI
      wxdaiData.debt.forEach((tx: any) => {
        allTransactions.push({
          timestamp: tx.timestamp,
          amount: tx.amount,
          type: tx.type,
          token: 'WXDAI',
          txHash: tx.txHash,
          version: 'V3'
        });
      });

      // Transactions de supply WXDAI
      wxdaiData.supply.forEach((tx: any) => {
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

    // Ajouter les transactions V2
    if (dataV2?.data?.transactions?.WXDAI) {
      const v2Data = dataV2.data.transactions.WXDAI;
      
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
          <title>RMM Analytics - Analyse en cours</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center max-w-md">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-200 border-t-blue-500 mx-auto mb-6"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Analyse en cours</h2>
            <p className="text-gray-600 text-sm">Récupération des données RMM pour {address}</p>
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
    
    const usdcSummary = usdcData?.summary;
    const wxdaiSummary = wxdaiData?.summary;
    
    const usdcBorrowDetails = usdcData?.borrow?.dailyDetails || [];
    const usdcSupplyDetails = usdcData?.supply?.dailyDetails || [];
    const wxdaiBorrowDetails = wxdaiData?.borrow?.dailyDetails || [];
    const wxdaiSupplyDetails = wxdaiData?.supply?.dailyDetails || [];

    return (
      <>
        <Head>
          <title>RMM Analytics - Résultats</title>
        </Head>

        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 py-8">
            {/* En-tête */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">RMM Analytics</h1>
                  <p className="text-gray-600">
                    Adresse: <span className="font-mono bg-gray-100 px-3 py-1 rounded-lg text-sm">{address}</span>
                  </p>
                </div>
                <button 
                  onClick={resetForm}
                  className="bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors font-medium"
                >
                  Nouvelle analyse
                </button>
              </div>
            </div>

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

            {/* Résumé USDC */}
            {usdcSummary && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Résumé USDC</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-red-50 border border-red-100 p-6 rounded-xl">
                    <h3 className="text-sm font-medium text-red-700 mb-2">Intérêts d'emprunt</h3>
                    <p className="text-3xl font-bold text-red-600">
                      {formatAmount(usdcSummary.totalBorrowInterest).toFixed(2)} USDC
                    </p>
                  </div>
                  <div className="bg-green-50 border border-green-100 p-6 rounded-xl">
                    <h3 className="text-sm font-medium text-green-700 mb-2">Intérêts de dépôt</h3>
                    <p className="text-3xl font-bold text-green-600">
                      {formatAmount(usdcSummary.totalSupplyInterest).toFixed(2)} USDC
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl">
                    <h3 className="text-sm font-medium text-blue-700 mb-2">Gain net</h3>
                    <p className={`text-3xl font-bold ${parseFloat(usdcSummary.netInterest) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatAmount(usdcSummary.netInterest).toFixed(2)} USDC
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
                title="Évolution de la dette USDC"
                color="#ef4444"
                currentBalance={tokenBalances?.debtUSDC.balance === '0.00' ? '0' : tokenBalances?.debtUSDC.balance}
                type="line"
                tokenAddress="0x69c731aE5f5356a779f44C355aBB685d84e5E9e6"
                userAddress={address}
              />

            {/* Graphique Supply USDC */}
              <Chart
                data={prepareChartData(usdcSupplyDetails, 'supply', 6)}
                title="Évolution du supply USDC"
                color="#10b981"
                currentBalance={tokenBalances?.armmUSDC.balance === '0.00' ? '0' : tokenBalances?.armmUSDC.balance}
                type="area"
                tokenAddress="0xeD56F76E9cBC6A64b821e9c016eAFbd3db5436D1"
                userAddress={address}
              />
              </div>

            {/* Résumé WXDAI */}
            {wxdaiSummary && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Résumé WXDAI</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-red-50 border border-red-100 p-6 rounded-xl">
                    <h3 className="text-sm font-medium text-red-700 mb-2">Intérêts d'emprunt</h3>
                    <p className="text-3xl font-bold text-red-600">
                      {formatAmount(wxdaiSummary.totalBorrowInterest, 18).toFixed(2)} WXDAI
                    </p>
                  </div>
                  <div className="bg-green-50 border border-green-100 p-6 rounded-xl">
                    <h3 className="text-sm font-medium text-green-700 mb-2">Intérêts de dépôt</h3>
                    <p className="text-3xl font-bold text-green-600">
                      {formatAmount(wxdaiSummary.totalSupplyInterest, 18).toFixed(2)} WXDAI
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl">
                    <h3 className="text-sm font-medium text-blue-700 mb-2">Gain net</h3>
                    <p className={`text-3xl font-bold ${parseFloat(wxdaiSummary.netInterest) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatAmount(wxdaiSummary.netInterest, 18).toFixed(2)} WXDAI
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
                title="Évolution de la dette WXDAI"
                color="#f59e0b"
                currentBalance={tokenBalances?.debtWXDAI.balance === '0.00' ? '0' : tokenBalances?.debtWXDAI.balance}
                type="line"
                tokenAddress="0x9908801dF7902675C3FEDD6Fea0294D18D5d5d34"
                userAddress={address}
              />
                    
              {/* Graphique Supply WXDAI */}
              <Chart
                data={prepareChartData(wxdaiSupplyDetails, 'supply', 18)}
                title="Évolution du supply WXDAI"
                color="#3b82f6"
                currentBalance={tokenBalances?.armmWXDAI.balance === '0.00' ? '0' : tokenBalances?.armmWXDAI.balance}
                type="area"
                tokenAddress="0x0cA4f5554Dd9Da6217d62D8df2816c82bba4157b"
                userAddress={address}
              />
            </div>

            {/* Graphiques RMM v2 - Montants des transactions */}
            {dataV2 && (
              <>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Transactions RMM v2 - Montants</h2>
                  
                  {/* Vérifier si le wallet a des données V2 */}
                  {!dataV2.data?.results?.[0]?.data?.interests?.WXDAI ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">😢</div>
                      <p className="text-lg text-gray-600">
                        Ce wallet est trop jeune et n'a jamais connu la V2 :'(
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
                            <div className="grid grid-cols-1 gap-6 mb-6">
                              <div className="bg-green-50 border border-green-100 p-4 rounded-xl">
                                <h3 className="text-sm font-medium text-green-700 mb-2">WXDAI</h3>
                                <p className="text-lg font-bold text-green-600">
                                  Dette: {formatAmount(v2WxdaiData.borrow.totalInterest, 18).toFixed(2)} | 
                                  Supply: {formatAmount(v2WxdaiData.supply.totalInterest, 18).toFixed(2)}
                                </p>
                              </div>
                            </div>

                            {/* Graphiques WXDAI v2 */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                              {/* Graphique Dette WXDAI v2 */}
                              <Chart
                                data={prepareChartData(v2WxdaiBorrowDetails, 'debt', 18)}
                                title="Évolution de la dette WXDAI (v2)"
                                color="#f59e0b"
                                type="line"
                                tokenAddress="0x0ade75f269a054673883319baa50e5e0360a775f"
                                userAddress={address}
                              />

                              {/* Graphique Supply WXDAI v2 */}
                              <Chart
                                data={prepareChartData(v2WxdaiSupplyDetails, 'supply', 18)}
                                title="Évolution du supply WXDAI (v2)"
                                color="#3b82f6"
                                type="area"
                                tokenAddress="0xe91d153e0b41518a2ce8dd3d7944fa863463a97d"
                                userAddress={address}
                              />
                            </div>
                          </>
                        );
                      })()}
                    </>
                  )}
                </div>
              </>
            )}

            {/* Aucune donnée */}
            {data && (!usdcSummary || (usdcBorrowDetails.length === 0 && usdcSupplyDetails.length === 0)) && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                <div className="text-gray-400 text-6xl mb-4">📊</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Aucune donnée</h2>
                <p className="text-gray-600">Aucune transaction RMM trouvée pour cette adresse</p>
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
        <meta name="description" content="Analysez vos gains et pertes RMM" />
      </Head>

      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 w-full max-w-md">
          {/* En-tête */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              RMM Analytics
            </h1>
            <p className="text-gray-600 text-lg">
              Analysez vos gains et pertes RMM
            </p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-3">
                Adresse EVM
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
              Analyser
            </button>
          </form>

          {/* Note */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-sm text-blue-800">
              💡 <strong>Info:</strong> Saisissez votre adresse EVM pour voir vos transactions RMM et calculer vos gains/pertes.
            </p>
          </div>
        </div>
      </div>
    </>
  );
} 