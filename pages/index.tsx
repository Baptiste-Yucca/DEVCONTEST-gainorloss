import React, { useState } from 'react';
import Head from 'next/head';
import AddressForm from '../components/AddressForm';
import WalletDashboard from '../components/WalletDashboard';
import { WalletData } from '../types/wallet';

export default function Home() {
  const [wallets, setWallets] = useState<string[]>(['']);
  const [walletData, setWalletData] = useState<WalletData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddressChange = (index: number, address: string) => {
    const newWallets = [...wallets];
    newWallets[index] = address;
    setWallets(newWallets);
  };

  const addWallet = () => {
    if (wallets.length < 3) {
      setWallets([...wallets, '']);
    }
  };

  const removeWallet = (index: number) => {
    if (wallets.length > 1) {
      const newWallets = wallets.filter((_, i) => i !== index);
      setWallets(newWallets);
    }
  };

  // Fonction de conversion des montants selon le token
  const convertAmount = (amount: number, token: 'USDC' | 'WXDAI'): number => {
    if (token === 'USDC') {
      return amount / 1e6; // USDC: 6 décimales
    } else {
      return amount / 1e18; // WXDAI: 18 décimales
    }
  };

  const handleSubmit = async () => {
    const validAddresses = wallets.filter(addr => addr.trim() !== '');
    if (validAddresses.length === 0) return;

    setIsLoading(true);
    try {
      console.log('🚀 Envoi des adresses:', validAddresses);
      
      // Construire l'URL avec les adresses en paramètres
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const addressesParam = validAddresses.join('/');
      const apiUrl = `${backendUrl}/api/rmm/v3/${addressesParam}`;
      
      console.log('📡 Appel direct backend:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Données reçues:', data);
        
        // Transformer les données du backend vers le format frontend
        const transformedData = data.data.results.map((result: any) => {
          const addressData = result.data;
          const interests = addressData.interests;
          
          return {
            address: result.address,
            usdc: {
              debt: convertAmount(interests?.USDC?.borrow?.summary?.currentDebt || 0, 'USDC'),
              supply: convertAmount(interests?.USDC?.supply?.summary?.currentSupply || 0, 'USDC'),
              totalInterest: convertAmount((interests?.USDC?.borrow?.totalInterest || 0) + 
                                          (interests?.USDC?.supply?.totalInterest || 0), 'USDC'),
              dailyDetails: interests?.USDC?.borrow?.dailyDetails || []
            },
            wxdai: {
              debt: convertAmount(interests?.WXDAI?.borrow?.summary?.currentDebt || 0, 'WXDAI'),
              supply: convertAmount(interests?.WXDAI?.supply?.summary?.currentSupply || 0, 'WXDAI'),
              totalInterest: convertAmount((interests?.WXDAI?.borrow?.totalInterest || 0) + 
                                          (interests?.WXDAI?.supply?.totalInterest || 0), 'WXDAI'),
              dailyDetails: interests?.WXDAI?.borrow?.dailyDetails || []
            },
            summary: {
              totalDebt: convertAmount(interests?.USDC?.borrow?.summary?.currentDebt || 0, 'USDC') + 
                         convertAmount(interests?.WXDAI?.borrow?.summary?.currentDebt || 0, 'WXDAI'),
              totalSupply: convertAmount(interests?.USDC?.supply?.summary?.currentSupply || 0, 'USDC') + 
                           convertAmount(interests?.WXDAI?.supply?.summary?.currentSupply || 0, 'WXDAI'),
              netPosition: (convertAmount(interests?.USDC?.supply?.summary?.currentSupply || 0, 'USDC') + 
                            convertAmount(interests?.WXDAI?.supply?.summary?.currentSupply || 0, 'WXDAI')) - 
                           (convertAmount(interests?.USDC?.borrow?.summary?.currentDebt || 0, 'USDC') + 
                            convertAmount(interests?.WXDAI?.borrow?.summary?.currentDebt || 0, 'WXDAI')),
              totalInterest: convertAmount((interests?.USDC?.borrow?.totalInterest || 0) + 
                                          (interests?.USDC?.supply?.totalInterest || 0), 'USDC') + 
                             convertAmount((interests?.WXDAI?.borrow?.totalInterest || 0) + 
                                          (interests?.WXDAI?.supply?.totalInterest || 0), 'WXDAI')
            }
          };
        });
        
        setWalletData(transformedData);
      } else {
        console.error('❌ Erreur backend:', response.status, response.statusText);
        alert(`Erreur backend: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Erreur réseau:', error);
      alert('Erreur de connexion au serveur. Vérifiez que le backend est démarré.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>RMM Gain - Analyse de Portefeuille</title>
        <meta name="description" content="Analyse des gains RMM pour vos adresses" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center text-gray-900 mb-8">
            RMM Gain
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Analysez vos gains et dettes sur le protocole RMM
          </p>

          <AddressForm
            wallets={wallets}
            onAddressChange={handleAddressChange}
            onAddWallet={addWallet}
            onRemoveWallet={removeWallet}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />

          {walletData.length > 0 && (
            <WalletDashboard 
              walletData={walletData}
              wallets={wallets.filter(addr => addr.trim() !== '')}
            />
          )}
        </div>
      </main>
    </div>
  );
} 