import React from 'react';
import { DailyDetail } from '../types/wallet';

interface WalletChartProps {
  data: DailyDetail[];
  token: string;
  debt: number;
  supply: number;
}

const WalletChart: React.FC<WalletChartProps> = ({ data, token, debt, supply }) => {
  if (data.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <p className="text-gray-500">Aucune donnée disponible pour {token}</p>
      </div>
    );
  }

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(num);
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(
      parseInt(dateStr.substring(0, 4)),
      parseInt(dateStr.substring(4, 6)) - 1,
      parseInt(dateStr.substring(6, 8))
    );
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit' 
    });
  };

  // Préparer les données pour le graphique
  const chartData = data.map(item => ({
    date: formatDate(item.date),
    debt: item.debt || 0,
    supply: item.supply || 0,
    interest: item.dailyInterest,
    totalInterest: item.totalInterest
  }));

  // Trouver les valeurs max pour l'échelle
  const maxValue = Math.max(
    ...chartData.map(d => Math.max(d.debt, d.supply)),
    1 // Éviter la division par zéro
  );

  const maxInterest = Math.max(
    ...chartData.map(d => d.totalInterest),
    1
  );

  return (
    <div className="bg-white border rounded-lg p-4">
      {/* En-tête avec les montants actuels */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <span className="text-sm font-medium text-gray-600">Dette: </span>
          <span className="text-sm font-bold text-red-600">
            {formatNumber(debt)} {token}
          </span>
        </div>
        <div>
          <span className="text-sm font-medium text-gray-600">Dépôt: </span>
          <span className="text-sm font-bold text-green-600">
            {formatNumber(supply)} {token}
          </span>
        </div>
      </div>

      {/* Graphique d'évolution dans le temps */}
      <div className="relative h-64 mb-4">
        <svg className="w-full h-full" viewBox={`0 0 ${chartData.length * 20} 200`}>
          {/* Grille de fond */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Ligne de dette */}
          {chartData.map((item, index) => {
            if (index === 0) return null;
            const prevItem = chartData[index - 1];
            const x1 = (index - 1) * 20;
            const x2 = index * 20;
            const y1 = 200 - (prevItem.debt / maxValue) * 180;
            const y2 = 200 - (item.debt / maxValue) * 180;
            
            return (
              <line
                key={`debt-${index}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#ef4444"
                strokeWidth="2"
                fill="none"
              />
            );
          })}
          
          {/* Ligne de dépôt */}
          {chartData.map((item, index) => {
            if (index === 0) return null;
            const prevItem = chartData[index - 1];
            const x1 = (index - 1) * 20;
            const x2 = index * 20;
            const y1 = 200 - (prevItem.supply / maxValue) * 180;
            const y2 = 200 - (item.supply / maxValue) * 180;
            
            return (
              <line
                key={`supply-${index}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#10b981"
                strokeWidth="2"
                fill="none"
              />
            );
          })}
          
          {/* Points de données */}
          {chartData.map((item, index) => (
            <g key={`points-${index}`}>
              {item.debt > 0 && (
                <circle
                  cx={index * 20}
                  cy={200 - (item.debt / maxValue) * 180}
                  r="3"
                  fill="#ef4444"
                />
              )}
              {item.supply > 0 && (
                <circle
                  cx={index * 20}
                  cy={200 - (item.supply / maxValue) * 180}
                  r="3"
                  fill="#10b981"
                />
              )}
            </g>
          ))}
        </svg>
        
        {/* Échelle */}
        <div className="absolute left-0 top-0 text-xs text-gray-500">
          {formatNumber(maxValue)}
        </div>
        <div className="absolute left-0 bottom-0 text-xs text-gray-500">
          0
        </div>
      </div>

      {/* Graphique des intérêts cumulés */}
      <div className="relative h-32 mb-4">
        <svg className="w-full h-full" viewBox={`0 0 ${chartData.length * 20} 100`}>
          <rect width="100%" height="100%" fill="#f9fafb" />
          
          {/* Ligne des intérêts cumulés */}
          {chartData.map((item, index) => {
            if (index === 0) return null;
            const prevItem = chartData[index - 1];
            const x1 = (index - 1) * 20;
            const x2 = index * 20;
            const y1 = 100 - (prevItem.totalInterest / maxInterest) * 80;
            const y2 = 100 - (item.totalInterest / maxInterest) * 80;
            
            return (
              <line
                key={`interest-${index}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#3b82f6"
                strokeWidth="2"
                fill="none"
              />
            );
          })}
          
          {/* Points d'intérêts */}
          {chartData.map((item, index) => (
            <circle
              key={`interest-point-${index}`}
              cx={index * 20}
              cy={100 - (item.totalInterest / maxInterest) * 80}
              r="2"
              fill="#3b82f6"
            />
          ))}
        </svg>
        
        {/* Échelle intérêts */}
        <div className="absolute left-0 top-0 text-xs text-gray-500">
          {formatNumber(maxInterest)}
        </div>
        <div className="absolute left-0 bottom-0 text-xs text-gray-500">
          0
        </div>
      </div>

      {/* Légende */}
      <div className="flex justify-center space-x-4 text-xs">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span>Dette</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>Dépôt</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span>Intérêts cumulés</span>
        </div>
      </div>

      {/* Dates */}
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>{chartData[0]?.date}</span>
        <span>{chartData[chartData.length - 1]?.date}</span>
      </div>
    </div>
  );
};

export default WalletChart; 