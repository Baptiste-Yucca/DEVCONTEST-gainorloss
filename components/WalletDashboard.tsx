import React, { useState } from 'react';
import { WalletDashboardProps } from '../types/wallet';
import WalletChart from './WalletChart';
import WalletSummary from './WalletSummary';

const WalletDashboard: React.FC<WalletDashboardProps> = ({ walletData, wallets }) => {
  const [activeTab, setActiveTab] = useState(0);

  if (walletData.length === 0) return null;

  // Si une seule adresse, afficher directement
  if (walletData.length === 1) {
    const wallet = walletData[0];
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">
          Portefeuille: {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
        </h2>
        
        <WalletSummary wallet={wallet} />
        
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Graphiques</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-3">USDC</h4>
              <WalletChart 
                data={wallet.usdc.dailyDetails}
                token="USDC"
                debt={wallet.usdc.debt}
                supply={wallet.usdc.supply}
              />
            </div>
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-3">WXDAI</h4>
              <WalletChart 
                data={wallet.wxdai.dailyDetails}
                token="WXDAI"
                debt={wallet.wxdai.debt}
                supply={wallet.wxdai.supply}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Si plusieurs adresses, afficher avec onglets
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">
        Portefeuilles ({walletData.length})
      </h2>
      
      {/* Onglets */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {walletData.map((wallet, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === index
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
            </button>
          ))}
        </nav>
      </div>
      
      {/* Contenu de l'onglet actif */}
      <div>
        <WalletSummary wallet={walletData[activeTab]} />
        
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Graphiques</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-3">USDC</h4>
              <WalletChart 
                data={walletData[activeTab].usdc.dailyDetails}
                token="USDC"
                debt={walletData[activeTab].usdc.debt}
                supply={walletData[activeTab].usdc.supply}
              />
            </div>
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-3">WXDAI</h4>
              <WalletChart 
                data={walletData[activeTab].wxdai.dailyDetails}
                token="WXDAI"
                debt={walletData[activeTab].wxdai.debt}
                supply={walletData[activeTab].wxdai.supply}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletDashboard; 