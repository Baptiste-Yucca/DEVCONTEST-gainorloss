// components/DailyDataTable.tsx
import React, { useState } from 'react';
import { DailyData } from '../types/dailyData';

interface DailyDataTableProps {
  dailyData: DailyData[];
  address?: string;
}

const DailyDataTable: React.FC<DailyDataTableProps> = ({ dailyData, address = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  if (!dailyData || dailyData.length === 0) {
    return (
      <div className="mt-8 text-center text-gray-600">
        Aucune donnée disponible pour cette adresse
      </div>
    );
  }

  // Fonction pour formater la date YYYYMMDD en YYYY/MM/DD
  const formatDisplayDate = (dateStr: string): string => {
    if (dateStr.length < 8) return dateStr;
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${year}/${month}/${day}`;
  };

  // Générer un nom de fichier avec l'adresse (version courte si adresse présente)
  const getFileName = (extension: string): string => {
    let shortAddress = '';
    if (address) {
      shortAddress = '_' + address.substring(0, 6) + '...' + address.substring(address.length - 4);
    }
    return `dailydatas${shortAddress}.${extension}`;
  };

  // Fonctions d'exportation
  const exportToCSV = () => {
    // Préparer les données pour l'export CSV
    const headers = ['Date', 'Montant (USDC)', 'Intérêt (USDC)', 'Taux (%)'];
    const csvData = dailyData.map(data => {
      return [
        formatDisplayDate(data.date),
        (Number(data.amount) / 1000000).toString(),
        (Number(data.interest) / 1000000).toString(),
        (parseFloat(data.rate) * 100).toString()
      ];
    });

    // Créer le contenu CSV
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    // Créer un blob et déclencher le téléchargement
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', getFileName('csv'));
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = () => {
    // Préparer les données pour l'export JSON
    const jsonData = dailyData.map(data => {
      return {
        date: formatDisplayDate(data.date),
        montant: Number(data.amount) / 1000000,
        interet: Number(data.interest) / 1000000,
        taux: parseFloat(data.rate) * 100
      };
    });

    // Créer un blob et déclencher le téléchargement
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', getFileName('json'));
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mt-6 bg-white rounded-lg shadow overflow-hidden">
      <div 
        className="flex justify-between items-center p-4 cursor-pointer bg-gray-50 hover:bg-gray-100"
        onClick={toggleExpanded}
        onKeyDown={(e) => e.key === 'Enter' && toggleExpanded()}
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label="Afficher/masquer les données journalières"
      >
        <h3 className="text-lg font-semibold">Données journalières</h3>
        <span className="text-xs">
          {isExpanded ? 'Masquer' : 'Afficher'}
        </span>
      </div>

      {isExpanded && (
        <>
          <div className="flex justify-end space-x-2 p-2 bg-gray-50">
            <button 
              onClick={exportToCSV}
              className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              aria-label="Exporter au format CSV"
            >
              Exporter CSV
            </button>
            <button 
              onClick={exportToJSON}
              className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              aria-label="Exporter au format JSON"
            >
              Exporter JSON
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Date</th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Montant (USDC)</th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Intérêt (USDC)</th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Taux</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dailyData.map((data, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="py-3 px-4">{formatDisplayDate(data.date)}</td>
                    <td className="py-3 px-4 text-right">{Number(data.amount) / 1000000}</td>
                    <td className="py-3 px-4 text-right">{Number(data.interest) / 1000000}</td>
                    <td className="py-3 px-4 text-right">{parseFloat(data.rate) * 100}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default DailyDataTable;