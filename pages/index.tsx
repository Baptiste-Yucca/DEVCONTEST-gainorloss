import React, { useState } from 'react';
import Head from 'next/head';

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

// Fonction pour générer des dates lisibles (max 10)
const generateReadableDates = (dailyDetails: DailyDetail[]): DailyDetail[] => {
  if (dailyDetails.length <= 10) return dailyDetails;
  
  const step = Math.floor(dailyDetails.length / 9);
  const readableDates: DailyDetail[] = [];
  
  for (let i = 0; i < dailyDetails.length; i += step) {
    readableDates.push(dailyDetails[i]);
    if (readableDates.length >= 10) break;
  }
  
  // Ajouter la dernière date si elle n'est pas incluse
  if (readableDates[readableDates.length - 1] !== dailyDetails[dailyDetails.length - 1]) {
    readableDates.push(dailyDetails[dailyDetails.length - 1]);
  }
  
  return readableDates;
};

// Fonction pour générer des valeurs Y lisibles (max 5 + 0 si négatif)
const generateReadableValues = (values: number[]): number[] => {
  if (values.length === 0) return [0];
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  
  if (range === 0) return [min];
  
  const step = range / 4;
  const readableValues: number[] = [];
  
  for (let i = 0; i <= 4; i++) {
    readableValues.push(min + (step * i));
  }
  
  // Ajouter 0 si il y a des valeurs négatives et que 0 n'est pas déjà inclus
  if (min < 0 && !readableValues.includes(0)) {
    readableValues.push(0);
    readableValues.sort((a, b) => a - b);
  }
  
  return readableValues;
};

export default function Home() {
  const [address, setAddress] = useState('');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Fonction pour formater les montants pour l'affichage
  const formatDisplayAmount = (amount: number): string => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    } else {
      return amount.toFixed(2);
    }
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
    } catch (err) {
      console.error('❌ Erreur lors de la récupération des données:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAddress('');
    setData(null);
    setError(null);
    setLoading(false);
  };

  // Écran de chargement
  if (loading) {
    return (
      <>
        <Head>
          <title>RMM Calculator - Analyse en cours</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900">Analyse en cours...</h2>
            <p className="text-gray-600 mt-2">Récupération des données RMM pour {address}</p>
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
          <title>RMM Calculator - Résultats</title>
        </Head>

        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
          <div className="max-w-6xl mx-auto">
            {/* En-tête avec bouton retour */}
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">Analyse RMM</h1>
                  <p className="text-gray-600 text-sm">
                    Adresse: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{address}</span>
                  </p>
                </div>
                <button 
                  onClick={resetForm}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Nouvelle analyse
                </button>
              </div>
            </div>

            {/* Erreur */}
            {error && (
              <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                <div className="text-center">
                  <div className="text-red-500 text-6xl mb-4">⚠️</div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur</h2>
                  <p className="text-gray-600">{error}</p>
                </div>
              </div>
            )}

            {/* Résumé USDC */}
            {usdcSummary && (
              <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Résumé USDC</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-red-800 mb-1">Intérêts d'emprunt</h3>
                    <p className="text-2xl font-bold text-red-600">
                      {formatAmount(usdcSummary.totalBorrowInterest).toFixed(2)} USDC
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-green-800 mb-1">Intérêts de dépôt</h3>
                    <p className="text-2xl font-bold text-green-600">
                      {formatAmount(usdcSummary.totalSupplyInterest).toFixed(2)} USDC
                    </p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-blue-800 mb-1">Gain net</h3>
                    <p className={`text-2xl font-bold ${parseFloat(usdcSummary.netInterest) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatAmount(usdcSummary.netInterest).toFixed(2)} USDC
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Graphique Dette USDC */}
            {usdcBorrowDetails.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Évolution de la dette USDC</h2>
                
                <div className="h-96 w-full">
                  <svg className="w-full h-full" viewBox="0 0 800 300">
                    {/* Axes */}
                    <line x1="50" y1="250" x2="750" y2="250" stroke="#e5e7eb" strokeWidth="2" />
                    <line x1="50" y1="250" x2="50" y2="50" stroke="#e5e7eb" strokeWidth="2" />
                    
                    {/* Axes Y lisibles */}
                    {(() => {
                      const values = usdcBorrowDetails.map(d => formatAmount(d.debt || '0'));
                      const readableValues = generateReadableValues(values);
                      return readableValues.map((value, i) => {
                        const y = 250 - ((value / Math.max(...readableValues)) * 200);
                        return (
                          <g key={i}>
                            <line x1="45" y1={y} x2="50" y2={y} stroke="#e5e7eb" strokeWidth="1" />
                            <text x="40" y={y + 3} fontSize="8" fill="#6b7280" textAnchor="end">
                              {formatDisplayAmount(value)}
                            </text>
                          </g>
                        );
                      });
                    })()}
                    
                    {/* Axes X lisibles */}
                    {(() => {
                      const readableDates = generateReadableDates(usdcBorrowDetails);
                      return readableDates.map((detail, i) => {
                        const originalIndex = usdcBorrowDetails.findIndex(d => d.date === detail.date);
                        const x = 50 + (originalIndex * (700 / Math.max(usdcBorrowDetails.length - 1, 1)));
                        return (
                          <g key={i}>
                            <line x1={x} y1="250" x2={x} y2="255" stroke="#e5e7eb" strokeWidth="1" />
                            <text x={x} y="270" textAnchor="middle" fontSize="8" fill="#6b7280">
                              {formatDate(detail.date)}
                            </text>
                          </g>
                        );
                      });
                    })()}
                    
                    {/* Données du graphique */}
                    {usdcBorrowDetails.map((detail, index) => {
                      const x = 50 + (index * (700 / Math.max(usdcBorrowDetails.length - 1, 1)));
                      const maxDebt = Math.max(...usdcBorrowDetails.map(d => formatAmount(d.debt || '0')));
                      const y = 250 - ((formatAmount(detail.debt || '0') / maxDebt) * 200);
                      
                      return (
                        <g key={index}>
                          {/* Point */}
                          <circle
                            cx={x}
                            cy={y}
                            r="3"
                            fill="#ef4444"
                          />
                          
                          {/* Ligne vers le point suivant */}
                          {index < usdcBorrowDetails.length - 1 && (
                            <line
                              x1={x}
                              y1={y}
                              x2={50 + ((index + 1) * (700 / Math.max(usdcBorrowDetails.length - 1, 1)))}
                              y2={250 - ((formatAmount(usdcBorrowDetails[index + 1].debt || '0') / maxDebt) * 200)}
                              stroke="#ef4444"
                              strokeWidth="2"
                            />
                          )}
                        </g>
                      );
                    })}
                    
                    {/* Légende Y */}
                    <text x="20" y="60" fontSize="10" fill="#6b7280" textAnchor="middle" transform="rotate(-90, 20, 60)">
                      Dette (USDC)
                    </text>
                    
                    {/* Légende X */}
                    <text x="400" y="290" fontSize="10" fill="#6b7280" textAnchor="middle">
                      Date
                    </text>
                  </svg>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 text-center">
                <div className="text-gray-400 text-4xl mb-2">📉</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Aucune transaction de dette</h3>
                <p className="text-gray-600 text-sm">Pas de transactions d'emprunt/remboursement USDC</p>
              </div>
            )}

            {/* Graphique Supply USDC */}
            {usdcSupplyDetails.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Évolution du supply USDC</h2>
                
                <div className="h-96 w-full">
                  <svg className="w-full h-full" viewBox="0 0 800 300">
                    {/* Axes */}
                    <line x1="50" y1="250" x2="750" y2="250" stroke="#e5e7eb" strokeWidth="2" />
                    <line x1="50" y1="250" x2="50" y2="50" stroke="#e5e7eb" strokeWidth="2" />
                    
                    {/* Axes Y lisibles */}
                    {(() => {
                      const values = usdcSupplyDetails.map(d => formatAmount(d.supply || '0'));
                      const readableValues = generateReadableValues(values);
                      return readableValues.map((value, i) => {
                        const y = 250 - ((value / Math.max(...readableValues)) * 200);
                        return (
                          <g key={i}>
                            <line x1="45" y1={y} x2="50" y2={y} stroke="#e5e7eb" strokeWidth="1" />
                            <text x="40" y={y + 3} fontSize="8" fill="#6b7280" textAnchor="end">
                              {formatDisplayAmount(value)}
                            </text>
                          </g>
                        );
                      });
                    })()}
                    
                    {/* Axes X lisibles */}
                    {(() => {
                      const readableDates = generateReadableDates(usdcSupplyDetails);
                      return readableDates.map((detail, i) => {
                        const originalIndex = usdcSupplyDetails.findIndex(d => d.date === detail.date);
                        const x = 50 + (originalIndex * (700 / Math.max(usdcSupplyDetails.length - 1, 1)));
                        return (
                          <g key={i}>
                            <line x1={x} y1="250" x2={x} y2="255" stroke="#e5e7eb" strokeWidth="1" />
                            <text x={x} y="270" textAnchor="middle" fontSize="8" fill="#6b7280">
                              {formatDate(detail.date)}
                            </text>
                          </g>
                        );
                      });
                    })()}
                    
                    {/* Données du graphique */}
                    {usdcSupplyDetails.map((detail, index) => {
                      const x = 50 + (index * (700 / Math.max(usdcSupplyDetails.length - 1, 1)));
                      const maxSupply = Math.max(...usdcSupplyDetails.map(d => formatAmount(d.supply || '0')));
                      const y = 250 - ((formatAmount(detail.supply || '0') / maxSupply) * 200);
                      
                      return (
                        <g key={index}>
                          {/* Point */}
                          <circle
                            cx={x}
                            cy={y}
                            r="3"
                            fill="#10b981"
                          />
                          
                          {/* Ligne vers le point suivant */}
                          {index < usdcSupplyDetails.length - 1 && (
                            <line
                              x1={x}
                              y1={y}
                              x2={50 + ((index + 1) * (700 / Math.max(usdcSupplyDetails.length - 1, 1)))}
                              y2={250 - ((formatAmount(usdcSupplyDetails[index + 1].supply || '0') / maxSupply) * 200)}
                              stroke="#10b981"
                              strokeWidth="2"
                            />
                          )}
                        </g>
                      );
                    })}
                    
                    {/* Légende Y */}
                    <text x="20" y="60" fontSize="10" fill="#6b7280" textAnchor="middle" transform="rotate(-90, 20, 60)">
                      Supply (USDC)
                    </text>
                    
                    {/* Légende X */}
                    <text x="400" y="290" fontSize="10" fill="#6b7280" textAnchor="middle">
                      Date
                    </text>
                  </svg>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 text-center">
                <div className="text-gray-400 text-4xl mb-2">📈</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Aucune transaction de supply</h3>
                <p className="text-gray-600 text-sm">Pas de transactions de dépôt/retrait USDC</p>
              </div>
            )}

            {/* Résumé WXDAI */}
            {wxdaiSummary && (
              <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Résumé WXDAI</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-red-800 mb-1">Intérêts d'emprunt</h3>
                    <p className="text-2xl font-bold text-red-600">
                      {formatAmount(wxdaiSummary.totalBorrowInterest, 18).toFixed(2)} WXDAI
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-green-800 mb-1">Intérêts de dépôt</h3>
                    <p className="text-2xl font-bold text-green-600">
                      {formatAmount(wxdaiSummary.totalSupplyInterest, 18).toFixed(2)} WXDAI
                    </p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-blue-800 mb-1">Gain net</h3>
                    <p className={`text-2xl font-bold ${parseFloat(wxdaiSummary.netInterest) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatAmount(wxdaiSummary.netInterest, 18).toFixed(2)} WXDAI
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Graphique Dette WXDAI */}
            {wxdaiBorrowDetails.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Évolution de la dette WXDAI</h2>
                
                <div className="h-96 w-full">
                  <svg className="w-full h-full" viewBox="0 0 800 300">
                    {/* Axes */}
                    <line x1="50" y1="250" x2="750" y2="250" stroke="#e5e7eb" strokeWidth="2" />
                    <line x1="50" y1="250" x2="50" y2="50" stroke="#e5e7eb" strokeWidth="2" />
                    
                    {/* Axes Y lisibles */}
                    {(() => {
                      const values = wxdaiBorrowDetails.map(d => formatAmount(d.debt || '0', 18));
                      const readableValues = generateReadableValues(values);
                      return readableValues.map((value, i) => {
                        const y = 250 - ((value / Math.max(...readableValues)) * 200);
                        return (
                          <g key={i}>
                            <line x1="45" y1={y} x2="50" y2={y} stroke="#e5e7eb" strokeWidth="1" />
                            <text x="40" y={y + 3} fontSize="8" fill="#6b7280" textAnchor="end">
                              {formatDisplayAmount(value)}
                            </text>
                          </g>
                        );
                      });
                    })()}
                    
                    {/* Axes X lisibles */}
                    {(() => {
                      const readableDates = generateReadableDates(wxdaiBorrowDetails);
                      return readableDates.map((detail, i) => {
                        const originalIndex = wxdaiBorrowDetails.findIndex(d => d.date === detail.date);
                        const x = 50 + (originalIndex * (700 / Math.max(wxdaiBorrowDetails.length - 1, 1)));
                        return (
                          <g key={i}>
                            <line x1={x} y1="250" x2={x} y2="255" stroke="#e5e7eb" strokeWidth="1" />
                            <text x={x} y="270" textAnchor="middle" fontSize="8" fill="#6b7280">
                              {formatDate(detail.date)}
                            </text>
                          </g>
                        );
                      });
                    })()}
                    
                    {/* Données du graphique */}
                    {wxdaiBorrowDetails.map((detail, index) => {
                      const x = 50 + (index * (700 / Math.max(wxdaiBorrowDetails.length - 1, 1)));
                      const maxDebt = Math.max(...wxdaiBorrowDetails.map(d => formatAmount(d.debt || '0', 18)));
                      const y = 250 - ((formatAmount(detail.debt || '0', 18) / maxDebt) * 200);
                      
                      return (
                        <g key={index}>
                          {/* Point */}
                          <circle
                            cx={x}
                            cy={y}
                            r="3"
                            fill="#ef4444"
                          />
                          
                          {/* Ligne vers le point suivant */}
                          {index < wxdaiBorrowDetails.length - 1 && (
                            <line
                              x1={x}
                              y1={y}
                              x2={50 + ((index + 1) * (700 / Math.max(wxdaiBorrowDetails.length - 1, 1)))}
                              y2={250 - ((formatAmount(wxdaiBorrowDetails[index + 1].debt || '0', 18) / maxDebt) * 200)}
                              stroke="#ef4444"
                              strokeWidth="2"
                            />
                          )}
                        </g>
                      );
                    })}
                    
                    {/* Légende Y */}
                    <text x="20" y="60" fontSize="10" fill="#6b7280" textAnchor="middle" transform="rotate(-90, 20, 60)">
                      Dette (WXDAI)
                    </text>
                    
                    {/* Légende X */}
                    <text x="400" y="290" fontSize="10" fill="#6b7280" textAnchor="middle">
                      Date
                    </text>
                  </svg>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 text-center">
                <div className="text-gray-400 text-4xl mb-2">📉</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Aucune transaction de dette</h3>
                <p className="text-gray-600 text-sm">Pas de transactions d'emprunt/remboursement WXDAI</p>
              </div>
            )}

            {/* Graphique Supply WXDAI */}
            {wxdaiSupplyDetails.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Évolution du supply WXDAI</h2>
                
                <div className="h-96 w-full">
                  <svg className="w-full h-full" viewBox="0 0 800 300">
                    {/* Axes */}
                    <line x1="50" y1="250" x2="750" y2="250" stroke="#e5e7eb" strokeWidth="2" />
                    <line x1="50" y1="250" x2="50" y2="50" stroke="#e5e7eb" strokeWidth="2" />
                    
                    {/* Axes Y lisibles */}
                    {(() => {
                      const values = wxdaiSupplyDetails.map(d => formatAmount(d.supply || '0', 18));
                      const readableValues = generateReadableValues(values);
                      return readableValues.map((value, i) => {
                        const y = 250 - ((value / Math.max(...readableValues)) * 200);
                        return (
                          <g key={i}>
                            <line x1="45" y1={y} x2="50" y2={y} stroke="#e5e7eb" strokeWidth="1" />
                            <text x="40" y={y + 3} fontSize="8" fill="#6b7280" textAnchor="end">
                              {formatDisplayAmount(value)}
                            </text>
                          </g>
                        );
                      });
                    })()}
                    
                    {/* Axes X lisibles */}
                    {(() => {
                      const readableDates = generateReadableDates(wxdaiSupplyDetails);
                      return readableDates.map((detail, i) => {
                        const originalIndex = wxdaiSupplyDetails.findIndex(d => d.date === detail.date);
                        const x = 50 + (originalIndex * (700 / Math.max(wxdaiSupplyDetails.length - 1, 1)));
                        return (
                          <g key={i}>
                            <line x1={x} y1="250" x2={x} y2="255" stroke="#e5e7eb" strokeWidth="1" />
                            <text x={x} y="270" textAnchor="middle" fontSize="8" fill="#6b7280">
                              {formatDate(detail.date)}
                            </text>
                          </g>
                        );
                      });
                    })()}
                    
                    {/* Données du graphique */}
                    {wxdaiSupplyDetails.map((detail, index) => {
                      const x = 50 + (index * (700 / Math.max(wxdaiSupplyDetails.length - 1, 1)));
                      const maxSupply = Math.max(...wxdaiSupplyDetails.map(d => formatAmount(d.supply || '0', 18)));
                      const y = 250 - ((formatAmount(detail.supply || '0', 18) / maxSupply) * 200);
                      
                      return (
                        <g key={index}>
                          {/* Point */}
                          <circle
                            cx={x}
                            cy={y}
                            r="3"
                            fill="#10b981"
                          />
                          
                          {/* Ligne vers le point suivant */}
                          {index < wxdaiSupplyDetails.length - 1 && (
                            <line
                              x1={x}
                              y1={y}
                              x2={50 + ((index + 1) * (700 / Math.max(wxdaiSupplyDetails.length - 1, 1)))}
                              y2={250 - ((formatAmount(wxdaiSupplyDetails[index + 1].supply || '0', 18) / maxSupply) * 200)}
                              stroke="#10b981"
                              strokeWidth="2"
                            />
                          )}
                        </g>
                      );
                    })}
                    
                    {/* Légende Y */}
                    <text x="20" y="60" fontSize="10" fill="#6b7280" textAnchor="middle" transform="rotate(-90, 20, 60)">
                      Supply (WXDAI)
                    </text>
                    
                    {/* Légende X */}
                    <text x="400" y="290" fontSize="10" fill="#6b7280" textAnchor="middle">
                      Date
                    </text>
                  </svg>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 text-center">
                <div className="text-gray-400 text-4xl mb-2">📈</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Aucune transaction de supply</h3>
                <p className="text-gray-600 text-sm">Pas de transactions de dépôt/retrait WXDAI</p>
              </div>
            )}

            {/* Aucune donnée */}
            {data && (!usdcSummary || (usdcBorrowDetails.length === 0 && usdcSupplyDetails.length === 0)) && (
              <div className="bg-white rounded-2xl shadow-xl p-6 text-center">
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
        <title>RMM Gain Calculator</title>
        <meta name="description" content="Calculateur de gains RMM pour les adresses EVM" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          {/* En-tête */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              RMM Calculator
            </h1>
            <p className="text-gray-600">
              Analysez vos gains et pertes RMM
            </p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                Adresse EVM
              </label>
              <input
                type="text"
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="0x3f3994bb23c48204ddeb99aa6bf6dd275abf7a3f"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={!address.trim()}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Analyser
            </button>
          </form>

          {/* Note */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <strong>Info:</strong> Saisissez votre adresse EVM pour voir vos transactions RMM et calculer vos gains/pertes.
            </p>
          </div>
        </div>
      </div>
    </>
  );
} 