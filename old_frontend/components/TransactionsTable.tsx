import React, { useState } from 'react';
import { TransactionWithType } from '../types/transaction';
import { ethers } from 'ethers';

interface TransactionsTableProps {
  transactions: TransactionWithType[];
  address?: string;
}

const TransactionsTable: React.FC<TransactionsTableProps> = ({ transactions, address = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  if (!transactions || transactions.length === 0) {
    return (
      <div className="mt-8 text-center text-gray-600">
        Aucune transaction disponible pour cette adresse
      </div>
    );
  }

  // Trier les transactions du plus ancien au plus récent
  const sortedTransactions = [...transactions].sort((a, b) => 
    parseInt(a.formattedDate) - parseInt(b.formattedDate)
  );

  // Fonction pour formater la date YYYYMMDD... en YYYY/MM/DD HH:mm:ss
  const formatDisplayDate = (formattedDate: string) => {
    const year = formattedDate.substring(0, 4);
    const month = formattedDate.substring(4, 6);
    const day = formattedDate.substring(6, 8);
    const hours = formattedDate.substring(8, 10) || '00';
    const minutes = formattedDate.substring(10, 12) || '00';
    const seconds = formattedDate.substring(12, 14) || '00';

    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
  };

  // Fonction pour obtenir la couleur de fond en fonction du type de transaction
  const getTransactionTypeStyle = (type: string): string => {
    switch (type) {
      case 'borrow':
        return 'bg-red-100';
      case 'repay':
        return 'bg-blue-100';
      default:
        return '';
    }
  };

  // Fonction pour extraire le hash de transaction de l'ID composite
  const extractTransactionHash = (id: string): string => {
    // Format attendu: blockNumber:index:hashId:... 
    const parts = id.split(':');
    if (parts.length >= 3) {
      return parts[2]; // Récupérer le troisième élément qui contient le hash
    }
    return id; // Si le format n'est pas celui attendu, retourner l'id original
  };

  // Fonction pour formater l'ID de transaction (hashid)
  const formatHashId = (hash: string): string => {
    if (!hash || hash.length < 8) return hash;
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
  };

  // Générer un nom de fichier avec l'adresse (version courte si adresse présente)
  const getFileName = (extension: string): string => {
    let shortAddress = '';
    if (address) {
      shortAddress = '_' + address.substring(0, 6) + '...' + address.substring(address.length - 4);
    }
    return `rmm_transactions${shortAddress}.${extension}`;
  };

  // Fonctions d'exportation
  const exportToCSV = () => {
    // Préparer les données pour l'export CSV
    const headers = ['Date', 'Type', 'Montant', 'Token', 'Transaction Hash'];
    const csvData = sortedTransactions.map(tx => {
      const amount = parseFloat(ethers.formatUnits(tx.amount, tx.ticker === 'USDC' ? 6 : 18)).toFixed(6);
      return [
        formatDisplayDate(tx.formattedDate),
        tx.transactionType,
        amount,
        tx.ticker,
        extractTransactionHash(tx.id)
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
    const jsonData = sortedTransactions.map(tx => {
      const amount = parseFloat(ethers.formatUnits(tx.amount, tx.ticker === 'USDC' ? 6 : 18)).toFixed(6);
      return {
        date: formatDisplayDate(tx.formattedDate),
        type: tx.transactionType,
        amount,
        token: tx.ticker,
        transactionHash: extractTransactionHash(tx.id)
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
    <div className="mt-6 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
      <div 
        className="flex justify-between items-center p-4 cursor-pointer bg-gradient-to-r from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 transition-colors duration-200"
        onClick={toggleExpanded}
        onKeyDown={(e) => e.key === 'Enter' && toggleExpanded()}
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label="Afficher/masquer les transactions"
      >
        <h3 className="text-base font-semibold text-indigo-700">Récapitulatif des transactions ({sortedTransactions.length})</h3>
        <span className="text-xs font-medium px-3 py-1 bg-indigo-200 text-indigo-800 rounded-full">
          {isExpanded ? 'Masquer' : 'Afficher'}
        </span>
      </div>

      {isExpanded && (
        <>
          <div className="flex justify-end space-x-2 p-3 bg-gray-50 border-t border-b border-gray-200">
            <button 
              onClick={exportToCSV}
              className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded-full hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
              aria-label="Exporter au format CSV"
            >
              Exporter CSV
            </button>
            <button 
              onClick={exportToJSON}
              className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
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
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Type</th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Montant</th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Token</th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Transaction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedTransactions.map((tx, index) => {
                  const txHash = extractTransactionHash(tx.id);
                  return (
                  <tr key={index} className={`hover:bg-gray-50 ${getTransactionTypeStyle(tx.transactionType)}`}>
                    <td className="py-3 px-4">{formatDisplayDate(tx.formattedDate)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        tx.transactionType === 'borrow' 
                          ? 'bg-red-100 text-red-800' 
                          : tx.transactionType === 'repay'
                            ? 'bg-blue-100 text-blue-800'
                            : tx.transactionType === 'supply'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {tx.transactionType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {parseFloat(ethers.formatUnits(tx.amount, tx.ticker === 'USDC' ? 6 : 18)).toFixed(6)}
                    </td>
                    <td className="py-3 px-4 text-right">{tx.ticker}</td>
                    <td className="py-3 px-4 text-center">
                      <a 
                        href={`https://gnosisscan.io/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-900 underline text-sm"
                        aria-label={`Voir la transaction ${txHash} sur Gnosisscan`}
                        tabIndex={0}
                      >
                        {formatHashId(txHash)}
                      </a>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default TransactionsTable;
