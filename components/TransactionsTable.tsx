import React, { useState, useMemo } from 'react';
import { Transaction } from '../utils/api/types';

interface TransactionWithType extends Transaction {
  type: 'borrow' | 'repay' | 'deposit' | 'withdraw';
  token: 'USDC' | 'WXDAI';
  version?: 'V2' | 'V3';
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
type VersionType = 'all' | 'V2' | 'V3';

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
  const [versionFilter, setVersionFilter] = useState<VersionType>('all');
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
      const versionMatch = versionFilter === 'all' || tx.version === versionFilter;
      
      // Filtre par date
      const txDate = new Date(tx.timestamp * 1000);
      const dateMatch = txDate >= dateRange.start && txDate <= dateRange.end;
      
      return tokenMatch && typeMatch && versionMatch && dateMatch;
    });
  }, [transactions, tokenFilter, typeFilter, versionFilter, dateRange]);

  // Fonction pour formater les montants
  const formatAmount = (amount: string, decimals = 6): number => {
    return parseFloat(amount) / Math.pow(10, decimals);
  };

  // Fonction pour formater les dates
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleDateString('fr-CH', {
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
    const headers = ['Date', 'Type', 'Token', 'Montant', 'Hash', 'Version'];
    const csvData = [
      headers.join(','),
      ...filteredTransactions.map(tx => [
        formatDate(tx.timestamp),
        tx.type,
        tx.token,
        formatAmount(tx.amount, tx.token === 'USDC' ? 6 : 18).toFixed(2),
        tx.txHash || 'Hash non disponible',
        tx.version || 'N/A'
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 lg:p-8">
      {/* ✅ HEADER: Responsive avec flex-col sur mobile, flex-row sur desktop */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h2>
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
        
        <div className="flex flex-col lg:flex-row gap-4">
          {/* ✅ STATISTIQUES: Responsive avec flex-wrap pour éviter le débordement */}
          {isCollapsed && (
            <div className="flex flex-wrap items-center gap-2 lg:gap-4 text-sm text-gray-600">
              <span>Total: {filteredTransactions.length}</span>
              <span>Borrow: {filteredTransactions.filter(tx => tx.type === 'borrow').length}</span>
              <span>Repay: {filteredTransactions.filter(tx => tx.type === 'repay').length}</span>
              <span>Deposit: {filteredTransactions.filter(tx => tx.type === 'deposit').length}</span>
              <span>Withdraw: {filteredTransactions.filter(tx => tx.type === 'withdraw').length}</span>
              <span>Period: {formatDateForInput(dateRange.start)} - {formatDateForInput(dateRange.end)}</span>
            </div>
          )}
          
          {/* ✅ FILTRES ET EXPORT: Responsive avec flex-col sur mobile, flex-row sur desktop */}
          {!isCollapsed && (
            <>
              {/* ✅ FILTRES: Responsive avec flex-col sur mobile, flex-row sur desktop */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={tokenFilter}
                    onChange={(e) => setTokenFilter(e.target.value as FilterType)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All tokens</option>
                    <option value="USDC">USDC</option>
                    <option value="WXDAI">WXDAI</option>
                  </select>
                  
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as TransactionType)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All types</option>
                    <option value="borrow">Borrow</option>
                    <option value="repay">Repay</option>
                    <option value="deposit">Deposit</option>
                    <option value="withdraw">Withdraw</option>
                  </select>
                  
                  <select
                    value={versionFilter}
                    onChange={(e) => setVersionFilter(e.target.value as VersionType)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All versions</option>
                    <option value="V2">V2</option>
                    <option value="V3">V3</option>
                  </select>
                </div>

                {/* ✅ FILTRE PAR DATE: Responsive avec flex-col sur mobile, flex-row sur desktop */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">From:</span>
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
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">To:</span>
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
                </div>
                
                {/* ✅ BOUTONS D'ACTION: Responsive */}
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
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ✅ CONTENU CONDITIONNEL */}
      {!isCollapsed && (
        <>
          {/* ✅ STATISTIQUES: Responsive avec grid adaptatif */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
            {/* Colonne 1: Total */}
            <div className="bg-blue-50 border border-blue-100 p-3 sm:p-4 rounded-xl">
              <h3 className="text-xs sm:text-sm font-medium text-blue-700 mb-1">Total</h3>
              <p className="text-lg sm:text-2xl font-bold text-blue-600">{filteredTransactions.length}</p>
            </div>
            
            {/* Colonne 2: Emprunts */}
            <div className="bg-red-50 border border-red-100 p-3 sm:p-4 rounded-xl">
              <h3 className="text-xs sm:text-sm font-medium text-red-700 mb-1">Borrow</h3>
              <p className="text-lg sm:text-2xl font-bold text-red-600">
                {filteredTransactions.filter(tx => tx.type === 'borrow').length}
              </p>
            </div>
            
            {/* Colonne 3: Remboursements */}
            <div className="bg-purple-50 border border-purple-100 p-3 sm:p-4 rounded-xl">
              <h3 className="text-xs sm:text-sm font-medium text-purple-700 mb-1">Repay</h3>
              <p className="text-lg sm:text-2xl font-bold text-purple-600">
                {filteredTransactions.filter(tx => tx.type === 'repay').length}
              </p>
            </div>
            
            {/* Colonne 4: Dépôts */}
            <div className="bg-green-50 border border-green-100 p-3 sm:p-4 rounded-xl">
              <h3 className="text-xs sm:text-sm font-medium text-green-700 mb-1">Deposit</h3>
              <p className="text-lg sm:text-2xl font-bold text-green-600">
                {filteredTransactions.filter(tx => tx.type === 'deposit').length}
              </p>
            </div>
            
            {/* Colonne 5: Retraits */}
            <div className="bg-orange-50 border border-orange-100 p-3 sm:p-4 rounded-xl">
              <h3 className="text-xs sm:text-sm font-medium text-orange-700 mb-1">Withdraw</h3>
              <p className="text-lg sm:text-2xl font-bold text-orange-600">
                {filteredTransactions.filter(tx => tx.type === 'withdraw').length}
              </p>
            </div>
            
            {/* Colonne 6: Période */}
            <div className="bg-gray-50 border border-gray-100 p-3 sm:p-4 rounded-xl col-span-2 sm:col-span-1">
              <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-1">Period</h3>
              <p className="text-xs sm:text-sm font-bold text-gray-600">
                {formatDateForInput(dateRange.start)} - {formatDateForInput(dateRange.end)}
              </p>
            </div>
          </div>

          {/* ✅ TABLEAU: Responsive avec scroll horizontal sur mobile */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-900 text-xs sm:text-sm">Date</th>
                  <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-900 text-xs sm:text-sm">Type</th>
                  <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-900 text-xs sm:text-sm">Token</th>
                  <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-900 text-xs sm:text-sm">Amount</th>
                  <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-900 text-xs sm:text-sm">Hash</th>
                  <th className="text-left py-3 px-2 sm:px-4 font-semibold text-gray-900 text-xs sm:text-sm">Version</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500 text-sm">
                      No transaction found with the current filters
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-600">
                        {formatDate(tx.timestamp)}
                      </td>
                      <td className="py-3 px-2 sm:px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTransactionColor(tx.type)}`}>
                          {getTransactionIcon(tx.type)} {tx.type}
                        </span>
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-600">
                        {tx.token}
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-900">
                        {formatAmount(tx.amount, tx.token === 'USDC' ? 6 : 18).toFixed(2)} {tx.token}
                      </td>
                      <td className="py-3 px-2 sm:px-4">
                        {tx.txHash ? (
                          <a
                            href={`https://gnosisscan.io/tx/${tx.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-mono truncate block max-w-xs"
                          >
                            {tx.txHash.slice(0, 8)}...{tx.txHash.slice(-6)}
                          </a>
                        ) : (
                          <span className="text-gray-400 text-xs sm:text-sm">Hash not available</span>
                        )}
                      </td>
                      <td className="py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-600">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          tx.version === 'V2' ? 'bg-blue-100 text-blue-700' : 
                          tx.version === 'V3' ? 'bg-green-100 text-green-700' : 
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {tx.version || 'N/A'}
                        </span>
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