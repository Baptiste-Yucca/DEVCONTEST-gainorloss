import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Header from '../components/Header';
import AddressForm from '../components/AddressForm';
import Loading from '../components/Loading';
import { formatAmount, formatTimestamp } from '../utils/helpers';
import { TOKENS, ADDRESS_SC_TO_TOKEN } from '../utils/constants';
import { AddressData, fetchAddressData } from '../utils/services/address';
import DailyDataTable from '../components/DailyDataTable';
import DailyDataChart from '../components/DailyDataChart';
import TransactionsTable from '../components/TransactionsTable';
import html2canvas from 'html2canvas';

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
  const [capturingImage, setCapturingImage] = useState<boolean>(false);
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
      setDailyData(result.dailyData);
      setTransactions(result.transactions);
      
      // Trier les données du plus vieux au plus récent
      const sortedData = [...result.dailyData].sort((a, b) => {
        return parseInt(a.date) - parseInt(b.date);
      });
      
      setDailyData(sortedData);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setDailyData([]);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour capturer le graphique en image
  const captureChartImage = async () => {
    try {
      setCapturingImage(true);
      const chartElement = document.querySelector('.h-80') as HTMLElement;
      
      if (chartElement) {
        const canvas = await html2canvas(chartElement, {
          backgroundColor: 'white',
          scale: 2, // Pour une meilleure qualité
        });
        
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        
        // Créer l'URL pour partager sur Telegram
        const text = `WAOW le RMM m'a couté... ${dailyData.reduce((sum, data) => sum + Number(data.interest) / 1000000, 0).toFixed(2)} USDC en intérêts... et toi ? Vérifie sur ${window.location.href}`;
        const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`;
        
        // Ouvrir l'image dans une nouvelle fenêtre pour téléchargement
        const newWindow = window.open();
        if (newWindow) {
          newWindow.document.write(`
            <html>
              <head>
                <title>Capture du graphique</title>
                <style>
                  body { 
                    margin: 0; 
                    display: flex; 
                    flex-direction: column; 
                    align-items: center;
                    font-family: Arial, sans-serif;
                    padding: 20px;
                  }
                  img { max-width: 100%; border: 1px solid #eee; margin-bottom: 20px; }
                  .actions { margin-top: 20px; }
                  button {
                    background-color: #4299e1;
                    color: white;
                    border: none;
                    padding: 10px 15px;
                    border-radius: 5px;
                    cursor: pointer;
                    margin: 0 10px;
                  }
                  button:hover {
                    background-color: #3182ce;
                  }
                  p { margin-bottom: 20px; }
                </style>
              </head>
              <body>
                <h2>Capture de votre graphique</h2>
                <p>Coût total de la dette: ${dailyData.reduce((sum, data) => sum + Number(data.interest) / 1000000, 0).toFixed(2)} USDC</p>
                <img src="${imageData}" alt="Graphique de dette" />
                <div class="actions">
                  <button onclick="downloadImage()">Télécharger l'image</button>
                  <button onclick="shareOnTelegram()">Partager sur Telegram</button>
                  <button onclick="window.close()">Fermer</button>
                </div>
                <p>Après téléchargement, vous pouvez partager cette image sur Telegram.</p>
                <script>
                  function downloadImage() {
                    const link = document.createElement('a');
                    link.download = 'rmm-dette-graphique.jpg';
                    link.href = '${imageData}';
                    link.click();
                  }
                  
                  function shareOnTelegram() {
                    window.open('${telegramUrl}', '_blank');
                  }
                </script>
              </body>
            </html>
          `);
          newWindow.document.close();
        }
      }
    } catch (error) {
      console.error("Erreur lors de la capture du graphique:", error);
    } finally {
      setCapturingImage(false);
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

      <main className="container mx-auto p-4 max-w-5xl">
        <div className="mt-8 mb-12 text-center">
          <h2 className="text-3xl font-bold mb-8 text-indigo-800 animate-pulse">
            😇 Es-tu prêt à connaitre la vérité? 😈
          </h2>
          <div className="max-w-md mx-auto">
            <AddressForm onSubmit={handleAddressSubmit} />
          </div>
        </div>

        {loading && <Loading />}
        
        {error && <ErrorMessage message={error} />}

        {!loading && searched && (
          <div className="my-8 bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-xl font-semibold mb-4 text-center text-indigo-700">Résultats pour l'adresse :</h3>
            <p className="text-gray-700 mb-8 break-all text-center bg-gray-50 p-3 rounded-lg border border-gray-200 font-mono text-sm">{address}</p>
            
            <div className="mb-10 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-md p-6 text-center border border-indigo-100">
              <h3 className="text-xl font-semibold mb-4 text-indigo-800">Voilà combien ça t'as couté...</h3>
              <p className="text-4xl font-bold text-red-600 mb-2 drop-shadow-sm">
                {dailyData.reduce((sum, data) => sum + Number(data.interest) / 1000000, 0).toFixed(2)} USDC
              </p>
              <p className="text-lg text-gray-700 mb-6">
                Soit environ <span className="font-semibold">{(dailyData.reduce((sum, data) => sum + Number(data.interest) / 1000000, 0) / 50).toFixed(2)} Realtokens</span>
              </p>
              
              <div className="flex flex-wrap justify-center gap-4 mt-6">
                <a 
                  href={`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(`WAOW le RMM m'a couté... ${dailyData.reduce((sum, data) => sum + Number(data.interest) / 1000000, 0).toFixed(2)} USDC en intérêts... et toi ? Vérifie sur ${window.location.href}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  Partage le résultat sur Telegram!
                </a>
              </div>
            </div>
            
            <div className="space-y-8">
              <DailyDataChart dailyData={dailyData} />
              <TransactionsTable transactions={transactions} address={address} />
              <DailyDataTable dailyData={dailyData} address={address} />
            </div>
          </div>
        )}
      </main>

      <footer className="mt-12 border-t border-gray-200 py-8 bg-gray-50">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p className="text-lg font-medium text-indigo-700">So, do you gain or loss?</p>
          <p className="mt-2 text-sm">Développé avec ❤️ pour la commu'</p>
        </div>
      </footer>
    </div>
  );
} 