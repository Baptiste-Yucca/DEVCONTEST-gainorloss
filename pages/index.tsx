import React, { useState } from 'react';
import Head from 'next/head';
import Chart from '../components/Chart';

// Types pour les données de l'API
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
      };
    }>;
  };
}

export default function Home() {
  const [address, setAddress] = useState('');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenBalances, setTokenBalances] = useState<TokenBalances | null>(null);

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

  // Fonction pour préparer les données pour Recharts
  const prepareChartData = (dailyDetails: DailyDetail[], valueKey: 'debt' | 'supply', decimals = 6) => {
    return dailyDetails.map(detail => ({
      date: detail.date,
      value: formatAmount(detail[valueKey] || '0', decimals),
      formattedDate: formatDate(detail.date)
    }));
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
      const apiUrl = `http://localhost:3001/api/rmm/v3/${address.trim()}`;
      console.log('🚀 Appel API vers:', apiUrl);
      
      const response = await fetch(apiUrl);
      console.log('📡 Réponse API:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ Données reçues:', result);
      setData(result);
      
      // Si on a des données, récupérer les balances des tokens
      if (result?.data?.results?.[0]?.success) {
        console.log('💰 Récupération des balances des tokens...');
        const balances = await fetchTokenBalances(address.trim());
        setTokenBalances(balances);
        console.log('✅ Balances récupérées:', balances);
      }
    } catch (err) {
      console.error('❌ Erreur lors de la récupération des données:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour récupérer les balances des tokens via l'API backend
  const fetchTokenBalances = async (userAddress: string): Promise<TokenBalances> => {
    try {
      console.log('💰 Récupération des balances via API backend...');
      
      const response = await fetch(`http://localhost:3001/api/balances/v3/${userAddress}`);
      
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
      console.error('Erreur lors de la récupération des balances:', error);
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
                currentBalance={tokenBalances?.debtUSDC.balance === '0.00' ? 'N/A' : tokenBalances?.debtUSDC.balance}
                type="line"
              />

              {/* Graphique Supply USDC */}
              <Chart
                data={prepareChartData(usdcSupplyDetails, 'supply', 6)}
                title="Évolution du supply USDC"
                color="#10b981"
                currentBalance={tokenBalances?.armmUSDC.balance === '0.00' ? 'N/A' : tokenBalances?.armmUSDC.balance}
                type="area"
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
                currentBalance={tokenBalances?.debtWXDAI.balance === '0.00' ? 'N/A' : tokenBalances?.debtWXDAI.balance}
                type="line"
              />

              {/* Graphique Supply WXDAI */}
              <Chart
                data={prepareChartData(wxdaiSupplyDetails, 'supply', 18)}
                title="Évolution du supply WXDAI"
                color="#3b82f6"
                currentBalance={tokenBalances?.armmWXDAI.balance}
                type="area"
              />
            </div>

            {/* Aucune donnée */}
            {data && (!usdcSummary || (usdcBorrowDetails.length === 0 && usdcSupplyDetails.length === 0)) && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                <div className="text-gray-400 text-6xl mb-4">📊</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Aucune donnée</h2>
                <p className="text-gray-600">Aucune transaction RMM trouvée pour cette adresse</p>
              </div>
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