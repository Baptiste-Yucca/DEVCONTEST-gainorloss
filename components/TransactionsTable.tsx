import React, { useState, useMemo } from 'react';
import { Transaction } from '../utils/api/types';

interface TransactionWithType extends Transaction {
  type: 'borrow' | 'repay' | 'deposit' | 'withdraw';
  token: 'USDC' | 'WXDAI';
  hash: string;
}

interface TransactionsTableProps {
  transactions: TransactionWithType[];
  userAddress: string;
  title: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

type FilterType = 'all' | 'USDC' | 'WXDAI';
type TransactionType = 'all' | 'borrow' | 'repay' | 'deposit' | 'withdraw';

interface DateRange {
  start: Date;
  end: Date;
}

const TransactionsTable: React.FC<TransactionsTableProps> = ({ 
  transactions, 
  userAddress, 
  title, 
  isCollapsed = false, 
  onToggleCollapse 
}) => {
  const [tokenFilter, setTokenFilter] = useState<FilterType>('all');
  const [typeFilter, setTypeFilter] = useState<TransactionType>('all');
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    if (transactions.length === 0) {
      const today = new Date();
      return { start: today, end: today };
    }
    
    const timestamps = transactions.map(tx => tx.timestamp * 1000);
    const minDate = new Date(Math.min(...timestamps));
    const maxDate = new Date(Math.max(...timestamps));
    
    return { start: minDate, end: maxDate };
  });

  // Filtrer les transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const tokenMatch = tokenFilter === 'all' || tx.token === tokenFilter;
      const typeMatch = typeFilter === 'all' || tx.type === typeFilter;
      
      // Filtre par date
      const txDate = new Date(tx.timestamp * 1000);
      const dateMatch = txDate >= dateRange.start && txDate <= dateRange.end;
      
      return tokenMatch && typeMatch && dateMatch;
    });
  }, [transactions, tokenFilter, typeFilter, dateRange]);

  // Fonction pour formater les montants
  const formatAmount = (amount: string, decimals = 6): number => {
    return parseFloat(amount) / Math.pow(10, decimals);
  };

  // Fonction pour formater les dates
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Fonction pour obtenir les dates min/max des transactions
  const getDateRange = () => {
    if (transactions.length === 0) {
      const today = new Date();
      return { min: today, max: today };
    }
    
    const timestamps = transactions.map(tx => tx.timestamp * 1000);
    return {
      min: new Date(Math.min(...timestamps)),
      max: new Date(Math.max(...timestamps))
    };
  };

  // Fonction pour formater une date pour l'input
  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Fonction pour obtenir l'icône du type de transaction
  const getTransactionIcon = (type: string): string => {
    switch (type) {
      case 'borrow': return '📤';
      case 'repay': return '📥';
      case 'deposit': return '💰';
      case 'withdraw': return '💸';
      default: return '📊';
    }
  };

  // Fonction pour obtenir la couleur du type de transaction
  const getTransactionColor = (type: string): string => {
    switch (type) {
      case 'borrow': return 'text-red-600';
      case 'repay': return 'text-green-600';
      case 'deposit': return 'text-blue-600';
      case 'withdraw': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  // Fonction pour exporter en CSV
  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Token', 'Montant', 'Hash'];
    const csvData = [
      headers.join(','),
      ...filteredTransactions.map(tx => [
        formatDate(tx.timestamp),
        tx.type,
        tx.token,
        formatAmount(tx.amount, tx.token === 'USDC' ? 6 : 18).toFixed(2),
        tx.hash
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_${userAddress}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              aria-label={isCollapsed ? "Dérouler" : "Enrouler"}
            >
              {isCollapsed ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              )}
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {/* Statistiques rapides quand collapsed */}
          {isCollapsed && (
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>Total: {filteredTransactions.length}</span>
              <span>Emprunts: {filteredTransactions.filter(tx => tx.type === 'borrow').length}</span>
              <span>Dépôts: {filteredTransactions.filter(tx => tx.type === 'deposit').length}</span>
              <span>Période: {formatDateForInput(dateRange.start)} - {formatDateForInput(dateRange.end)}</span>
            </div>
          )}
                      {/* Filtres et Export (seulement si pas collapsed) */}
            {!isCollapsed && (
              <>
                <div className="flex items-center gap-2">
                  <select
                    value={tokenFilter}
                    onChange={(e) => setTokenFilter(e.target.value as FilterType)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Tous les tokens</option>
                    <option value="USDC">USDC</option>
                    <option value="WXDAI">WXDAI</option>
                  </select>
                  
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as TransactionType)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Tous les types</option>
                    <option value="borrow">Emprunts</option>
                    <option value="repay">Remboursements</option>
                    <option value="deposit">Dépôts</option>
                    <option value="withdraw">Retraits</option>
                  </select>
                </div>

                {/* Filtre par date */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Du:</span>
                  <input
                    type="date"
                    value={formatDateForInput(dateRange.start)}
                    onChange={(e) => {
                      const newDate = new Date(e.target.value);
                      setDateRange(prev => ({ ...prev, start: newDate }));
                    }}
                    min={formatDateForInput(getDateRange().min)}
                    max={formatDateForInput(dateRange.end)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  
                  <span className="text-sm text-gray-600">Au:</span>
                  <input
                    type="date"
                    value={formatDateForInput(dateRange.end)}
                    onChange={(e) => {
                      const newDate = new Date(e.target.value);
                      setDateRange(prev => ({ ...prev, end: newDate }));
                    }}
                    min={formatDateForInput(dateRange.start)}
                    max={formatDateForInput(getDateRange().max)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {/* Boutons d'action */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setTokenFilter('all');
                      setTypeFilter('all');
                      const range = getDateRange();
                      setDateRange({ start: range.min, end: range.max });
                    }}
                    className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
                  >
                    🔄 Reset
                  </button>
                  
                  <button
                    onClick={exportToCSV}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    📊 Export CSV
                  </button>
                </div>
              </>
            )}
        </div>
      </div>

      {/* Contenu conditionnel */}
      {!isCollapsed && (
        <>
                    {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
              <h3 className="text-sm font-medium text-blue-700 mb-1">Total</h3>
              <p className="text-2xl font-bold text-blue-600">{filteredTransactions.length}</p>
            </div>
            <div className="bg-red-50 border border-red-100 p-4 rounded-xl">
              <h3 className="text-sm font-medium text-red-700 mb-1">Emprunts</h3>
              <p className="text-2xl font-bold text-red-600">
                {filteredTransactions.filter(tx => tx.type === 'borrow').length}
              </p>
            </div>
            <div className="bg-green-50 border border-green-100 p-4 rounded-xl">
              <h3 className="text-sm font-medium text-green-700 mb-1">Dépôts</h3>
              <p className="text-2xl font-bold text-green-600">
                {filteredTransactions.filter(tx => tx.type === 'deposit').length}
              </p>
            </div>
            <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl">
              <h3 className="text-sm font-medium text-orange-700 mb-1">Retraits</h3>
              <p className="text-2xl font-bold text-orange-600">
                {filteredTransactions.filter(tx => tx.type === 'withdraw').length}
              </p>
            </div>
            <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl">
              <h3 className="text-sm font-medium text-purple-700 mb-1">Période</h3>
              <p className="text-sm font-bold text-purple-600">
                {formatDateForInput(dateRange.start)} - {formatDateForInput(dateRange.end)}
              </p>
            </div>
          </div>

      {/* Tableau des transactions */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Type</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Token</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Montant</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Hash</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500">
                  Aucune transaction trouvée avec les filtres actuels
                </td>
              </tr>
            ) : (
              filteredTransactions.map((tx, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {formatDate(tx.timestamp)}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTransactionColor(tx.type)}`}>
                      {getTransactionIcon(tx.type)} {tx.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {tx.token}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">
                    {formatAmount(tx.amount, tx.token === 'USDC' ? 6 : 18).toFixed(2)} {tx.token}
                  </td>
                  <td className="py-3 px-4">
                    <a
                      href={`https://gnosisscan.io/tx/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm font-mono truncate block max-w-xs"
                    >
                      {tx.hash.slice(0, 8)}...{tx.hash.slice(-6)}
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
        </>
      )}
    </div>
  );
};

export default TransactionsTable; 