import React from 'react';
import { WalletData } from '../types/wallet';

interface WalletSummaryProps {
  wallet: WalletData;
}

const WalletSummary: React.FC<WalletSummaryProps> = ({ wallet }) => {
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(num);
  };

  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Position nette */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
        <h3 className="text-sm font-medium text-blue-800">Position Nette</h3>
        <p className={`text-2xl font-bold ${
          wallet.summary.netPosition >= 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {formatCurrency(wallet.summary.netPosition)}
        </p>
        <p className="text-xs text-blue-600 mt-1">
          {wallet.summary.netPosition >= 0 ? 'Gain' : 'Perte'}
        </p>
      </div>

      {/* Total Dépôts */}
      <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
        <h3 className="text-sm font-medium text-green-800">Total Dépôts</h3>
        <p className="text-2xl font-bold text-green-600">
          {formatCurrency(wallet.summary.totalSupply)}
        </p>
        <div className="text-xs text-green-600 mt-1">
          <p>USDC: {formatNumber(wallet.usdc.supply)}</p>
          <p>WXDAI: {formatNumber(wallet.wxdai.supply)}</p>
        </div>
      </div>

      {/* Total Dettes */}
      <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg">
        <h3 className="text-sm font-medium text-red-800">Total Dettes</h3>
        <p className="text-2xl font-bold text-red-600">
          {formatCurrency(wallet.summary.totalDebt)}
        </p>
        <div className="text-xs text-red-600 mt-1">
          <p>USDC: {formatNumber(wallet.usdc.debt)}</p>
          <p>WXDAI: {formatNumber(wallet.wxdai.debt)}</p>
        </div>
      </div>

      {/* Intérêts Totaux */}
      <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
        <h3 className="text-sm font-medium text-purple-800">Intérêts Totaux</h3>
        <p className={`text-2xl font-bold ${
          wallet.summary.totalInterest >= 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {formatCurrency(wallet.summary.totalInterest)}
        </p>
        <div className="text-xs text-purple-600 mt-1">
          <p>USDC: {formatNumber(wallet.usdc.totalInterest)}</p>
          <p>WXDAI: {formatNumber(wallet.wxdai.totalInterest)}</p>
        </div>
      </div>

      {/* Détail des intérêts par token */}
      <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* USDC Détail */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-2">USDC - Détail</h3>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-blue-600">Dette actuelle:</span>
              <span className="font-medium">{formatNumber(wallet.usdc.debt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-600">Dépôt actuel:</span>
              <span className="font-medium">{formatNumber(wallet.usdc.supply)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-600">Intérêts totaux:</span>
              <span className={`font-medium ${
                wallet.usdc.totalInterest >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatNumber(wallet.usdc.totalInterest)}
              </span>
            </div>
          </div>
        </div>

        {/* WXDAI Détail */}
        <div className="bg-orange-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-orange-800 mb-2">WXDAI - Détail</h3>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-orange-600">Dette actuelle:</span>
              <span className="font-medium">{formatNumber(wallet.wxdai.debt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-600">Dépôt actuel:</span>
              <span className="font-medium">{formatNumber(wallet.wxdai.supply)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-600">Intérêts totaux:</span>
              <span className={`font-medium ${
                wallet.wxdai.totalInterest >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatNumber(wallet.wxdai.totalInterest)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletSummary; 