import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '../components/Header';
import TransactionTable from '../components/TransactionTable';
import AllTransactionsTable from '../components/AllTransactionsTable';
import Loading from '../components/Loading';
import { fetchBorrows, fetchSupplies, fetchWithdraws, fetchRepays, Transaction } from '../utils/api';
import { isValidEthereumAddress } from '../utils/helpers';

export default function Dashboard() {
  const router = useRouter();
  const { address } = router.query;
  
  const [borrows, setBorrows] = useState<Transaction[]>([]);
  const [supplies, setSupplies] = useState<Transaction[]>([]);
  const [withdraws, setWithdraws] = useState<Transaction[]>([]);
  const [repays, setRepays] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [viewMode, setViewMode] = useState<'all' | 'separate'>('all');

  useEffect(() => {
    if (!address) return;
    
    if (typeof address !== 'string' || !isValidEthereumAddress(address)) {
      setError('Adresse invalide');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError('');
      
      try {
        // Fetchs indépendants pour continuer même si l'un échoue
        let borrowsData: Transaction[] = [];
        let suppliesData: Transaction[] = [];
        let withdrawsData: Transaction[] = [];
        let repaysData: Transaction[] = [];
        
        try {
          borrowsData = await fetchBorrows(address);
        } catch (err) {
          console.error('Error fetching borrows:', err);
        }
        
        try {
          suppliesData = await fetchSupplies(address);
        } catch (err) {
          console.error('Error fetching supplies:', err);
        }
        
        try {
          withdrawsData = await fetchWithdraws(address);
        } catch (err) {
          console.error('Error fetching withdraws:', err);
        }
        
        try {
          repaysData = await fetchRepays(address);
        } catch (err) {
          console.error('Error fetching repays:', err);
        }
        
        setBorrows(borrowsData || []);
        setSupplies(suppliesData || []);
        setWithdraws(withdrawsData || []);
        setRepays(repaysData || []);
        
        // Si toutes les données sont vides, et qu'au moins une requête a échoué, afficher un message d'erreur
        if (
          (!borrowsData?.length && !suppliesData?.length && !withdrawsData?.length && !repaysData?.length) &&
          (borrowsData === undefined || suppliesData === undefined || withdrawsData === undefined || repaysData === undefined)
        ) {
          setError('Erreur lors de la récupération des données. Veuillez réessayer plus tard.');
        }
        
      } catch (err) {
        console.error('Global error fetching data:', err);
        setError('Erreur lors de la récupération des données. Veuillez réessayer plus tard.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [address]);

  const handleBack = () => {
    router.push('/');
  };

  const totalTransactions = supplies.length + withdraws.length + borrows.length + repays.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>rmmgain - Dashboard</title>
        <meta name="description" content="Dashboard des transactions" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />

      <main className="container mx-auto p-4 max-w-7xl">
        <div className="mt-6 flex justify-between items-center">
          <button
            onClick={handleBack}
            className="flex items-center text-indigo-600 hover:text-indigo-900"
            aria-label="Retour"
            tabIndex={0}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Retour
          </button>
          <h1 className="text-2xl font-bold">Tableau de bord</h1>
          <div className="w-24"></div>
        </div>

        {address && (
          <div className="my-6 p-4 bg-white rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">Adresse :</h2>
            <p className="text-gray-700 break-all">{address}</p>
          </div>
        )}

        {loading && <Loading />}
        
        {error && (
          <div className="my-4 p-4 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {!loading && !error && totalTransactions > 0 && (
          <div>
            <div className="mb-8 p-4 bg-white rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">Résumé des transactions :</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-blue-800 font-semibold">Dépôts de liquidités</div>
                  <div className="text-2xl font-bold text-blue-600">{supplies.length}</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-green-800 font-semibold">Retraits de liquidités</div>
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
            </div>

            <div className="mb-6 flex justify-center">
              <div className="inline-flex rounded-md shadow-sm" role="group">
                <button
                  type="button"
                  onClick={() => setViewMode('all')}
                  className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                    viewMode === 'all'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Vue unifiée
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('separate')}
                  className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                    viewMode === 'separate'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Vue détaillée
                </button>
              </div>
            </div>
            
            {viewMode === 'all' ? (
              <AllTransactionsTable 
                supplies={supplies} 
                withdraws={withdraws} 
                borrows={borrows} 
                repays={repays} 
              />
            ) : (
              <div className="space-y-8">
                <TransactionTable transactions={supplies} title="Dépôts de liquidités" />
                <TransactionTable transactions={withdraws} title="Retraits de liquidités" />
                <TransactionTable transactions={borrows} title="Emprunts" />
                <TransactionTable transactions={repays} title="Remboursements" />
              </div>
            )}
          </div>
        )}

        {!loading && !error && totalTransactions === 0 && (
          <div className="my-8 p-6 bg-white rounded-lg shadow text-center">
            <h2 className="text-xl font-semibold mb-2">Aucune transaction trouvée</h2>
            <p className="text-gray-600">
              Cette adresse n'a pas encore effectué de transactions sur le protocole.
            </p>
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